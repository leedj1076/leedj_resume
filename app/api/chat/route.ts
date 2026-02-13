import { streamText, generateText, embed, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { getResumeIndex } from "@/lib/pinecone";
import { detectFilter, getCompanyOverviewId } from "@/lib/entity-detection";
import { validateVisitorData } from "@/lib/visitor-data";
import {
  PERSONA_SECTION_WEIGHTS,
  PERSONA_TONE,
  FOCUS_HIGHLIGHT,
  FOCUS_SKILL_TERMS,
  CORE_STRENGTH_IDS,
} from "@/lib/persona-config";
import { logAnalytics } from "@/lib/analytics";
import type { Persona, Focus } from "@/lib/types";

// Simple in-memory rate limiter (per-IP, resets on deploy)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 15; // max requests per window
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Always-pinned: neutral context chunks
const BASE_PINNED_IDS = [
  "narrative-career-trajectory",
  "personal-summary",
];

const MAX_HISTORY = 10; // Keep last 5 exchanges (user + assistant)

interface ChunkRecord {
  id: string;
  enrichedText: string;
  depth: string;
  section: string;
  skills: string[];
  isCoreStrength: boolean;
}

export const maxDuration = 30;

/**
 * Build a retrieval query that incorporates conversation context.
 * For follow-ups like "How did you negotiate that?", this prepends the last
 * assistant summary so the embedding captures the topic being discussed.
 */
function buildRetrievalQuery(
  query: string,
  messages: Array<{ role: string; content?: string; parts?: Array<{ type: string; text?: string }> }>
): string {
  // Find the last assistant message
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      const assistantText =
        messages[i].content ??
        messages[i].parts
          ?.filter((p: { type: string }) => p.type === "text")
          .map((p: { text?: string }) => p.text ?? "")
          .join(" ") ??
        "";
      if (assistantText) {
        // Truncate assistant context to ~100 words to keep embedding focused
        const truncated = assistantText.split(/\s+/).slice(0, 100).join(" ");
        return `${truncated} ${query}`;
      }
      break;
    }
  }
  return query;
}

/**
 * Score a chunk for persona-aware re-ranking.
 */
function scoreChunk(
  chunk: ChunkRecord,
  persona: Persona,
  focus: Focus
): number {
  const weights = PERSONA_SECTION_WEIGHTS[persona];
  const sectionWeight = weights[chunk.section] ?? 1.0;
  const coreStrengthBonus = chunk.isCoreStrength ? 1.3 : 1.0;
  const focusTerms = FOCUS_SKILL_TERMS[focus];
  const focusMatchBonus =
    focus !== "full_stack" && chunk.skills.some((s) => focusTerms.includes(s))
      ? 1.25
      : 1.0;
  return sectionWeight * coreStrengthBonus * focusMatchBonus;
}

export async function POST(req: Request) {
  // Rate limit check
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { messages, type, lang } = body;
    const visitorData = validateVisitorData(body.visitorData);
    const { persona, focus } = visitorData;

    // --- Cold-start init handler ---
    if (type === "init") {
      const index = getResumeIndex();
      const ns = index.namespace("resume");

      const pinnedResults = await ns.fetch({ ids: CORE_STRENGTH_IDS });
      const coreTexts: string[] = [];
      for (const id of CORE_STRENGTH_IDS) {
        const record = pinnedResults.records[id];
        if (record?.metadata?.enrichedText) {
          coreTexts.push(record.metadata.enrichedText as string);
        }
      }

      const context = coreTexts.join("\n\n");
      const responseLang = lang === "ko" ? "Korean" : "English";

      const { text: welcome } = await generateText({
        model: google("gemini-2.5-flash"),
        temperature: 0.4,
        maxOutputTokens: 300,
        prompt: `You are the professional whose resume is provided below. Write a warm, personalized 2-3 sentence welcome message in ${responseLang}.
${PERSONA_TONE[persona]}
${FOCUS_HIGHLIGHT[focus]}

Keep it conversational — like greeting someone at a networking event. Highlight 1-2 of your most relevant strengths for this visitor type. End with an invitation to ask questions.
ONLY mention facts explicitly stated in the resume highlights below. Do not invent or embellish any details.

--- RESUME HIGHLIGHTS ---
${context}
--- END ---`,
      });

      logAnalytics({ type: "init", persona, focus, lang, timestamp: new Date().toISOString() });

      return new Response(
        JSON.stringify({ welcome }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // --- Regular chat handler ---

    // 1. Get the latest user message text
    const lastMessage = messages[messages.length - 1];
    const query =
      lastMessage.content ??
      lastMessage.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join(" ") ??
      "";

    // 2. Validate input
    if (!query.trim()) {
      return new Response(
        JSON.stringify({ error: "Empty message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const truncatedQuery = query.slice(0, 2000);

    // 3. Detect entity/section filter in query
    const detected = detectFilter(truncatedQuery);

    // 4. Build retrieval query with conversation context for better follow-up handling
    const retrievalQuery = buildRetrievalQuery(truncatedQuery, messages);

    // 5. Embed the retrieval query
    const { embedding } = await embed({
      model: google.embedding("gemini-embedding-001"),
      value: retrievalQuery.slice(0, 2000),
      providerOptions: { google: { taskType: "RETRIEVAL_QUERY" } },
    });

    const index = getResumeIndex();
    const ns = index.namespace("resume");

    // 6. Build dynamic pinned IDs
    const pinnedIds = [...BASE_PINNED_IDS];
    if (detected?.type === "company") {
      const overviewId = getCompanyOverviewId(detected.value);
      if (overviewId) pinnedIds.push(overviewId);
    }

    // 7. Build focus-aware filter query (when focus is not full_stack)
    const focusTerms = FOCUS_SKILL_TERMS[focus];
    const hasFocusFilter = focus !== "full_stack" && focusTerms.length > 0;

    // 8. Fetch chunks — parallel sources based on detected filter type
    const chunks = new Map<string, ChunkRecord>();

    if (detected?.type === "company") {
      const promises: Promise<unknown>[] = [
        ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
        ns.query({
          vector: embedding,
          topK: 20,
          includeMetadata: true,
          filter: { company: { $eq: detected.value } },
        }),
        ns.fetch({ ids: pinnedIds }),
      ];
      if (hasFocusFilter) {
        promises.push(
          ns.query({
            vector: embedding,
            topK: 8,
            includeMetadata: true,
            filter: { skills: { $in: focusTerms } },
          })
        );
      }
      const results = await Promise.all(promises);
      const [semanticResults, companyResults, pinnedResults] = results as [
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, companyResults.matches);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[3]) {
        addMatchChunks(chunks, (results[3] as { matches: Array<{ id: string; metadata?: Record<string, unknown> }> }).matches);
      }
    } else if (detected?.type === "temporal") {
      const promises: Promise<unknown>[] = [
        ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
        ns.query({
          vector: embedding,
          topK: 15,
          includeMetadata: true,
          filter: detected.filter,
        }),
        ns.fetch({ ids: pinnedIds }),
      ];
      if (hasFocusFilter) {
        promises.push(
          ns.query({
            vector: embedding,
            topK: 8,
            includeMetadata: true,
            filter: { skills: { $in: focusTerms } },
          })
        );
      }
      const results = await Promise.all(promises);
      const [semanticResults, temporalResults, pinnedResults] = results as [
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, temporalResults.matches);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[3]) {
        addMatchChunks(chunks, (results[3] as { matches: Array<{ id: string; metadata?: Record<string, unknown> }> }).matches);
      }
    } else if (detected?.type === "section") {
      const promises: Promise<unknown>[] = [
        ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
        ns.query({
          vector: embedding,
          topK: 15,
          includeMetadata: true,
          filter: { section: { $eq: detected.value } },
        }),
        ns.fetch({ ids: pinnedIds }),
      ];
      if (hasFocusFilter) {
        promises.push(
          ns.query({
            vector: embedding,
            topK: 8,
            includeMetadata: true,
            filter: { skills: { $in: focusTerms } },
          })
        );
      }
      const results = await Promise.all(promises);
      const [semanticResults, sectionResults, pinnedResults] = results as [
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, sectionResults.matches);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[3]) {
        addMatchChunks(chunks, (results[3] as { matches: Array<{ id: string; metadata?: Record<string, unknown> }> }).matches);
      }
    } else {
      const promises: Promise<unknown>[] = [
        ns.query({ vector: embedding, topK: 10, includeMetadata: true }),
        ns.fetch({ ids: pinnedIds }),
      ];
      if (hasFocusFilter) {
        promises.push(
          ns.query({
            vector: embedding,
            topK: 8,
            includeMetadata: true,
            filter: { skills: { $in: focusTerms } },
          })
        );
      }
      const results = await Promise.all(promises);
      const [semanticResults, pinnedResults] = results as [
        { matches: Array<{ id: string; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[2]) {
        addMatchChunks(chunks, (results[2] as { matches: Array<{ id: string; metadata?: Record<string, unknown> }> }).matches);
      }
    }

    // 9. Persona-aware re-ranking
    const rankedChunks = [...chunks.values()]
      .map((chunk) => ({
        chunk,
        score: scoreChunk(chunk, persona, focus),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((r) => r.chunk);

    // 10. Assemble structured context — separate overview from deep-dive
    const overviewChunks: string[] = [];
    const deepDiveChunks: string[] = [];

    for (const chunk of rankedChunks) {
      if (chunk.depth === "deep_dive") {
        deepDiveChunks.push(chunk.enrichedText);
      } else {
        overviewChunks.push(chunk.enrichedText);
      }
    }

    let context = "--- OVERVIEW ---\n" + overviewChunks.join("\n\n");
    if (deepDiveChunks.length > 0) {
      context +=
        "\n\n--- DETAILED STORIES (for follow-up depth) ---\n" +
        deepDiveChunks.join("\n\n");
    }
    context += "\n--- END RESUME ---";

    // 11. Log retrieval details
    if (process.env.NODE_ENV === "development") {
      console.log("[RAG] Query:", truncatedQuery);
      console.log("[RAG] Retrieval query:", retrievalQuery.slice(0, 200));
      console.log("[RAG] Detected filter:", detected);
      console.log("[RAG] Pinned IDs:", pinnedIds);
      console.log("[RAG] Persona:", persona, "Focus:", focus);
      console.log("[RAG] Retrieved chunks:", [...chunks.keys()]);
      console.log("[RAG] After re-ranking:", rankedChunks.map((c) => c.id));
      console.log("[RAG] Overview:", overviewChunks.length, "Deep:", deepDiveChunks.length);
    }

    logAnalytics({
      type: "query",
      query: truncatedQuery.slice(0, 200),
      persona,
      focus,
      chunksRetrieved: chunks.size,
      chunksAfterRerank: rankedChunks.length,
      timestamp: new Date().toISOString(),
    });

    // 12. Convert UI messages to model messages (sliding window)
    const recentMessages = messages.slice(-MAX_HISTORY);
    const modelMessages = await convertToModelMessages(recentMessages);

    // 13. Stream response with context injection
    const result = streamText({
      model: google("gemini-2.5-flash"),
      temperature: 0.3,
      maxOutputTokens: 1024,
      abortSignal: req.signal,
      system: `You are the professional whose resume is provided below. Answer questions as if you are speaking about yourself in first person ("I", "my", "me").
Be warm, conversational, and natural — like you're chatting with a recruiter over coffee.
Use a friendly but professional tone. Stay grounded in the facts from your resume.

RESPONSE DEPTH — this is critical:
- INITIAL or NEW TOPIC question: Give a **concise overview** using the OVERVIEW section (3-5 bullet points highlighting the most impressive achievements). Invite follow-up.
- FOLLOW-UP question (same topic as previous exchange): Go **deeper** — use the DETAILED STORIES section to share specific stories, metrics, negotiation details, and nuances. Be thorough and engaging.
- When the user switches to an UNRELATED topic: **reset to overview level** again.
- How to tell: if the user's question clearly relates to what was just discussed (e.g. "tell me more", "what about...", "how did you...", or referencing the same company/role/skill), treat it as a follow-up. Otherwise, treat it as a new topic.

CONTEXT STRUCTURE:
- The OVERVIEW section contains surface-level facts — use these for initial answers to ensure completeness.
- The DETAILED STORIES section contains in-depth stories with specific metrics, negotiation details, and lessons learned — use these for follow-up depth.

LANGUAGE: Detect the language of each user message and respond in the SAME language.
- If the user writes in Korean, respond entirely in Korean.
- If the user writes in English, respond entirely in English.

FORMAT YOUR RESPONSES for easy scanning:
- Use **bold** for company names, job titles, and key highlights
- Use bullet points to list achievements, skills, or multiple items
- Use short paragraphs — never a wall of text
- When covering multiple roles or topics, separate them with a brief heading or line break
- Lead with the most relevant/impressive point first

STRICT ACCURACY — this is the most important rule:
- ONLY answer using information explicitly present in the resume context below. Every claim you make must be directly traceable to a specific fact in the context.
- NEVER invent, infer, or extrapolate experiences, skills, metrics, company names, dates, or details that are not explicitly stated in the context.
- If a question asks about something not covered in the context, clearly say so. Do NOT attempt a partial answer by guessing or filling in gaps.
- Do not assume skills, technologies, or achievements beyond what is listed. If the context says "partnered with Apple" do not add details about what that partnership involved unless those details are in the context.
- If the question is partially answerable, answer ONLY the part supported by the context and explicitly state what you cannot answer.
- In English: "That's not something covered in my background — happy to chat more about what I do bring to the table though!"
- In Korean: "그 부분은 제 이력서에 포함되어 있지 않지만, 제가 가진 다른 역량에 대해 더 이야기해 드릴 수 있습니다!"

${PERSONA_TONE[persona]}

${FOCUS_HIGHLIGHT[focus]}

--- MY RESUME ---
${context}`,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[RAG] Error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// --- Helpers ---

function addPinnedChunks(
  chunks: Map<string, ChunkRecord>,
  ids: string[],
  pinnedResults: { records: Record<string, { metadata?: Record<string, unknown> } | undefined> }
) {
  for (const id of ids) {
    const record = pinnedResults.records[id];
    if (record?.metadata?.enrichedText) {
      chunks.set(id, {
        id,
        enrichedText: record.metadata.enrichedText as string,
        depth: (record.metadata.depth as string) ?? "surface",
        section: (record.metadata.section as string) ?? "",
        skills: (record.metadata.skills as string[]) ?? [],
        isCoreStrength: (record.metadata.is_core_strength as boolean) ?? false,
      });
    }
  }
}

function addMatchChunks(
  chunks: Map<string, ChunkRecord>,
  matches: Array<{ id: string; metadata?: Record<string, unknown> }>
) {
  for (const match of matches) {
    if (!chunks.has(match.id) && match.metadata?.enrichedText) {
      chunks.set(match.id, {
        id: match.id,
        enrichedText: match.metadata.enrichedText as string,
        depth: (match.metadata.depth as string) ?? "surface",
        section: (match.metadata.section as string) ?? "",
        skills: (match.metadata.skills as string[]) ?? [],
        isCoreStrength: (match.metadata.is_core_strength as boolean) ?? false,
      });
    }
  }
}
