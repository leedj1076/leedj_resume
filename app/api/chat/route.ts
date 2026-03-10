import { streamText, generateText, embed, convertToModelMessages, createUIMessageStreamResponse } from "ai";
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
import { logAnalytics, logExchange } from "@/lib/analytics";
import { sendNewSessionAlert } from "@/lib/email";
import { getAnswerMode } from "@/lib/settings";
import { ANSWER_MODE_PROMPTS } from "@/lib/answer-modes";
import type { Persona, Focus, ChatUIMessage, TraceStep } from "@/lib/types";

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

// Human-readable labels for specific chunk IDs
const CHUNK_LABELS: Record<string, string> = {
  "exp-dug-overview": "Devs United Games",
  "exp-dug-partnerships": "DUG Partnerships",
  "exp-dug-revenue": "DUG Revenue",
  "exp-dug-apple-spatial": "Apple Spatial Computing",
  "exp-dug-ai-ops": "DUG AI Ops",
  "experience-devs-united-games-scaling": "DUG Scaling",
  "exp-flint-overview": "Flint Technologies",
  "exp-flint-product-gtm": "Flint Product & GTM",
  "exp-flint-fundraising": "Flint Fundraising",
  "experience-flint-technologies-zero-to-one": "Flint Zero-to-One",
  "exp-tmax-team-lead": "Tmax Team Lead",
  "exp-tmax-enterprise-clients": "Enterprise Clients",
  "exp-tmax-software-engineer": "Tmax Engineering",
  "exp-kit-research": "KIT Research",
  "edu-kaist-bachelors": "KAIST B.S.",
  "edu-kaist-masters": "KAIST M.S.",
  "edu-kit-dual-degree": "KIT Dual Degree",
  "story-meta-quest-plus-revenue": "Meta Quest+ Revenue",
  "story-apple-partnership-negotiation": "Apple Partnership",
  "story-meta-funding-negotiation": "Meta Negotiation",
  "story-meta-game-concepts": "Meta Game Concepts",
  "story-google-android-xr-partnership": "Google Android XR",
  "story-partnership-negotiation-philosophy": "Partnership Philosophy",
  "story-dug-cs-automation": "CS Automation",
  "story-flint-problem-statement": "Flint Problem",
  "story-flint-product-concept": "Flint Product",
  "story-flint-validation-traction": "Flint Traction",
  "story-flint-business-model-growth": "Flint Business Model",
  "story-flint-gnn-technical": "GNN Technical",
  "story-flint-founder-equity-split": "Founder Equity",
  "story-tmax-database-tuning": "Database Tuning",
  "story-tmax-samsung-dbms-monitoring": "Samsung DBMS",
  "project-whiskey-rag": "RAG Project",
  "story-whiskey-rag-personal": "RAG Personal Story",
  "flint-seed-round-details": "Seed Round",
  "flint-fundraising-challenges": "Fundraising Challenges",
  "narrative-partnership-expertise": "Partnership Expertise",
  "narrative-embracing-challenges-and-learning": "Challenges & Learning",
  "summary-bridging-tech-and-business": "Tech × Business",
  "skills-expertise": "Skills & Expertise",
  "languages-international": "Languages",
  "extracurricular-atrium": "Leadership",
  "honors-awards": "Awards",
  "contact-info": "Contact",
  "interview-q1.1-self-introduction": "Self-Introduction",
  "interview-q2.1-why-vc": "Why VC",
  "interview-q2.3-five-year-vision-altos": "5-Year Vision",
  "interview-q2.4-altos-receive": "What From Firm",
  "interview-q3.1-engineer-to-business": "Engineer → Business",
  "interview-q3.2-tmaxtibero-lessons": "Tmax Lessons",
  "interview-q3.3-flint-shutdown": "Flint Shutdown",
  "interview-q3.4-dug-departure": "Why Left DUG",
  "interview-q3.5-breadth-strength-weakness": "Breadth vs Depth",
  "interview-q4.1-founder-philosophy": "Founder Philosophy",
  "interview-q4.2-good-vs-bad-investor": "Good vs Bad Investor",
  "interview-q4.3-restart-flint": "Restart Flint",
  "interview-q4.4-fundraising-hardest-part": "Fundraising Challenge",
  "interview-q4.5-shutting-down-flint-emotions": "Shutdown Emotions",
  "interview-q4.6-founding-again": "Founding Again?",
  "interview-q4.7-confidence-after-failure": "Confidence & Failure",
  "interview-q5.1-ace-evidence": "Ace Evidence",
  "interview-q5.2-beyond-expectations-example": "Beyond Expectations",
  "interview-q5.3-colleague-evaluation": "Colleague Evaluation",
  "interview-q13.2-handling-disagreement": "Handling Disagreement",
  "final-q1-finding-founders-sourcing": "Deal Sourcing",
  "final-q6-stress-mental-resilience": "Stress & Resilience",
  "final-q11-self-initiated-knowledge-system": "Self-Initiated Projects",
  "final-q8-what-makes-you-different": "What Makes DJ Different",
  "final-q9-why-hire-over-vc-experience": "Why Hire DJ",
  "final-q19-team-over-self-altruism": "Team Over Self",
  "final-q13-explosive-growth-jcurve": "Growth Experience",
  "final-q33-ten-year-vision": "10-Year Vision",
  "changjo-2026-current-role": "Changjo Current Role",
  "dug-meta-quest-plus-deal": "Meta Quest+ Deal",
  "dug-google-android-xr-partnership": "Google Android XR",
  "dug-walking-away-meta-funding": "Meta Funding Walk-Away",
  "education-kaist-kit": "KAIST & KIT Education",
  "technical-skills-overview": "Technical Background",
  "changjo-smart-farm-initiative": "Smart Farm Initiative",
  "languages-international-experience": "Languages & International",
  "tmaxtibero-technical-work": "TmaxTibero Technical",
  "leadership-cross-functional-management": "Cross-Functional Leadership",
};

// Chunks that are always pinned — exclude from source tags to avoid noise
const ALWAYS_PINNED = new Set([
  ...BASE_PINNED_IDS,
  "contact-info",
]);

interface ChunkRecord {
  id: string;
  enrichedText: string;
  depth: string;
  section: string;
  skills: string[];
  isCoreStrength: boolean;
  pineconeScore: number;
  question?: string;
  chunkType?: string;
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
    const { messages, type, lang, sessionId, coveredTopics, visitorEmail, internal } = body;
    const skipTracking = internal === true;
    const isInternal = internal === true;
    const traceSteps: TraceStep[] = [];
    const traceStart = Date.now();
    function addTrace(label: string, summary: string, data: Record<string, unknown>) {
      if (isInternal) {
        traceSteps.push({ label, timestamp: Date.now() - traceStart, summary, data });
      }
    }
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

      if (!skipTracking) logAnalytics({ type: "init", persona, focus, lang, timestamp: new Date().toISOString(), visitorEmail });

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

    // Fire-and-forget email alert on first message of a new session
    if (messages.length === 1) {
      sendNewSessionAlert({
        query: truncatedQuery,
        persona,
        focus,
        lang: lang ?? "en",
        sessionId: sessionId ?? "",
        visitorEmail,
      });
    }

    addTrace("Query Processing", `"${truncatedQuery.slice(0, 80)}${truncatedQuery.length > 80 ? '...' : ''}" | persona=${persona}, focus=${focus}`, {
      rawQuery: truncatedQuery.slice(0, 200),
      persona,
      focus,
      lang: lang ?? "en",
      messageCount: messages.length,
    });

    // 3. Detect entity/section filter in query
    const detected = detectFilter(truncatedQuery);

    addTrace("Entity Detection", detected ? `Found ${detected.type}: "${'value' in detected ? detected.value : 'temporal filter'}"` : "No entity detected", {
      detected: detected ?? null,
    });

    // 4. Rewrite the user query into a better search query for vector retrieval
    //    AND classify the intent as specific/broad/ambiguous.
    //    Uses a single fast LLM call. Falls back to current behavior on parse failure.
    let retrievalQuery: string;
    let rewriteResult: string | undefined;
    let intent: "specific" | "broad" | "ambiguous" = "specific";
    let clarifications: string[] = [];
    try {
      const conversationContext = messages.length > 2
        ? messages
            .slice(-4, -1)
            .filter((m: { role: string }) => m.role === "assistant" || m.role === "user")
            .map((m: { role: string; content?: string; parts?: Array<{ type: string; text?: string }> }) => {
              const text = m.content ?? m.parts?.filter((p: { type: string }) => p.type === "text").map((p: { text?: string }) => p.text ?? "").join(" ") ?? "";
              return `${m.role}: ${text.split(/\s+/).slice(0, 50).join(" ")}`;
            })
            .join("\n")
        : "";

      const rewritePrompt = `You are a search query optimizer for a professional resume database about Dong Jae Lee.

Analyze the visitor's question (and optional conversation context) and return a JSON object:
{
  "intent": "specific" | "broad" | "ambiguous",
  "query": "keyword-rich search query for embedding retrieval",
  "clarifications": ["option 1?", "option 2?"]
}

Intent rules:
- "specific": question targets a known topic, company, role, skill, or story (e.g. "How did you build the Apple partnership?", "What was your role at Flint?")
- "broad": question covers a wide area (e.g. "tell me about yourself", "what's your background?", "what's your experience?", "자기소개 해주세요")
- "ambiguous": unclear what the user is asking — vague pronouns without context, off-topic, or too vague to retrieve meaningfully (e.g. "how about that thing?", "what do you think?", "그거 어떻게 했어요?" without prior context)

Query rules:
- Expand vague references: "your startup" → "Flint Technologies co-founder COO startup", "gaming company" → "Devs United Games XR spatial computing"
- Include relevant proper nouns, role titles, company names, and domain terms
- Resolve pronouns using conversation context
- Keep the query under 50 words
- For broad intent, make the query cover the main career areas

Clarifications: only populate when intent is "ambiguous". Provide 2-3 clarifying questions that would help narrow down the answer. Write them in the same language as the user's question.

Output ONLY valid JSON, no markdown fences or extra text.

${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ""}User question: ${truncatedQuery}`;

      addTrace("Query Rewrite Prompt", `Sent to gemini-2.0-flash (${rewritePrompt.length} chars)`, {
        prompt: rewritePrompt,
      });

      ({ text: rewriteResult } = await generateText({
        model: google("gemini-2.0-flash"),
        temperature: 0,
        maxOutputTokens: 250,
        prompt: rewritePrompt,
      }));

      // Parse JSON response; fall back to plain-text query on failure
      try {
        const parsed = JSON.parse(rewriteResult.trim());
        retrievalQuery = (parsed.query || "").trim() || buildRetrievalQuery(truncatedQuery, messages);
        if (parsed.intent === "broad" || parsed.intent === "ambiguous") {
          intent = parsed.intent;
        }
        if (Array.isArray(parsed.clarifications) && parsed.clarifications.length > 0) {
          clarifications = parsed.clarifications.slice(0, 3);
        }
      } catch {
        // JSON parse failed — treat rewrite result as plain query string (backward compat)
        retrievalQuery = rewriteResult.trim() || buildRetrievalQuery(truncatedQuery, messages);
      }
    } catch {
      retrievalQuery = buildRetrievalQuery(truncatedQuery, messages);
    }

    addTrace("Query Rewrite Result", `Rewritten: "${retrievalQuery.slice(0, 100)}"`, {
      rawResult: rewriteResult?.trim() ?? "(fallback — no rewrite result)",
      rewrittenQuery: retrievalQuery,
      originalQuery: truncatedQuery,
    });

    addTrace("Intent Classification", `intent=${intent} | query: "${retrievalQuery.slice(0, 100)}"${clarifications.length > 0 ? ` | ${clarifications.length} clarifications` : ''}`, {
      intent,
      retrievalQuery: retrievalQuery.slice(0, 300),
      clarifications,
      hasConversationContext: messages.length > 2,
    });

    // 4a. Ambiguous intent — short-circuit before retrieval
    if (intent === "ambiguous" && clarifications.length > 0) {
      const responseLang = lang === "ko" ? "ko" : "en";
      const clarifyMessage = responseLang === "ko"
        ? "정확한 답변을 드리고 싶은데요, 어떤 부분이 궁금하신지 좀 더 알려주시겠어요?"
        : "I'd like to give you a specific answer! Could you help me narrow it down?";

      const followupBlock = `\n\n<followup>\n${clarifications.join("\n")}\n</followup>`;

      if (!skipTracking) {
        logAnalytics({
          type: "query",
          query: truncatedQuery.slice(0, 200),
          persona,
          focus,
          intent: "ambiguous",
          chunksRetrieved: 0,
          chunksAfterRerank: 0,
          timestamp: new Date().toISOString(),
          visitorEmail,
        });
        logExchange({
          sessionId: sessionId ?? "",
          persona,
          focus,
          lang: lang ?? "en",
          query: truncatedQuery,
          response: clarifyMessage + followupBlock,
          chunksUsed: [],
          visitorEmail,
        });
      }

      addTrace("Early Return", `Ambiguous intent — returning ${clarifications.length} clarifying questions`, {
        clarifications,
      });

      const traceForAmbiguous = isInternal ? { steps: traceSteps, totalDurationMs: Date.now() - traceStart } : undefined;
      const textPartId = "ambiguous-text";
      const stream = new ReadableStream({
        start(controller) {
          const fullText = clarifyMessage + followupBlock;
          controller.enqueue({ type: "start" });
          controller.enqueue({ type: "start-step" });
          controller.enqueue({ type: "text-start", id: textPartId });
          controller.enqueue({ type: "text-delta", id: textPartId, delta: fullText });
          controller.enqueue({ type: "text-end", id: textPartId });
          controller.enqueue({ type: "finish-step" });
          controller.enqueue({ type: "finish", finishReason: "stop", messageMetadata: { sourceTags: [], ...(traceForAmbiguous ? { trace: traceForAmbiguous } : {}) } });
          controller.close();
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    // 5. Embed queries — rewritten for general retrieval + raw for direct match detection
    const rawQueryDiffers = retrievalQuery !== truncatedQuery;
    const embeddingPromises = [
      embed({
        model: google.embedding("gemini-embedding-001"),
        value: retrievalQuery.slice(0, 2000),
        providerOptions: { google: { taskType: "RETRIEVAL_QUERY" } },
      }),
      ...(rawQueryDiffers && intent !== "broad" ? [
        embed({
          model: google.embedding("gemini-embedding-001"),
          value: truncatedQuery.slice(0, 2000),
          providerOptions: { google: { taskType: "RETRIEVAL_QUERY" } },
        }),
      ] : []),
    ];
    const embeddingResults = await Promise.all(embeddingPromises);
    const { embedding } = embeddingResults[0];
    const rawEmbedding = rawQueryDiffers && intent !== "broad" ? embeddingResults[1]?.embedding : null;

    addTrace("Embedding", `Embedded ${retrievalQuery.length} chars${rawEmbedding ? ' + raw query' : ''} with gemini-embedding-001`, {
      model: "gemini-embedding-001",
      queryLength: retrievalQuery.length,
      embeddingDimensions: embedding.length,
      hasRawEmbedding: !!rawEmbedding,
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
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, companyResults.matches);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[3]) {
        addMatchChunks(chunks, (results[3] as { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> }).matches);
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
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, temporalResults.matches);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[3]) {
        addMatchChunks(chunks, (results[3] as { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> }).matches);
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
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, sectionResults.matches);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[3]) {
        addMatchChunks(chunks, (results[3] as { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> }).matches);
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
        { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> },
        { records: Record<string, { metadata?: Record<string, unknown> } | undefined> },
      ];

      addPinnedChunks(chunks, pinnedIds, pinnedResults);
      addMatchChunks(chunks, semanticResults.matches);
      if (hasFocusFilter && results[2]) {
        addMatchChunks(chunks, (results[2] as { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> }).matches);
      }
    }

    addTrace("Retrieval", `${chunks.size} chunks retrieved | filter: ${detected?.type ?? 'none'} | pinned: ${pinnedIds.length}`, {
      totalChunks: chunks.size,
      filterType: detected?.type ?? "none",
      filterValue: detected && 'value' in detected ? detected.value : null,
      pinnedIds,
      hasFocusFilter,
      chunkIds: [...chunks.keys()],
      topScores: [...chunks.values()].sort((a, b) => b.pineconeScore - a.pineconeScore).slice(0, 5).map(c => ({
        id: c.id,
        score: Math.round(c.pineconeScore * 1000) / 1000,
        section: c.section,
      })),
    });

    // 9. Direct match detection via raw-query QA search
    //    The rewrite step can transform the query away from exact Q&A matches,
    //    so we search separately with the raw user query embedding.
    //    We detect the match BEFORE merging into chunks to avoid comparing
    //    scores from different embeddings (raw vs rewritten).
    let directMatchChunk: ChunkRecord | null = null;
    if (intent !== "broad" && rawEmbedding) {
      const rawQaResults = await ns.query({
        vector: rawEmbedding,
        topK: 5,
        includeMetadata: true,
        filter: { chunk_type: { $eq: "qa_story" } },
      });
      const rawQaMatches = (rawQaResults as { matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> }).matches;

      // Detect direct match using raw scores (same embedding space)
      if (rawQaMatches.length >= 1 && (rawQaMatches[0].score ?? 0) >= 0.72) {
        const topScore = rawQaMatches[0].score ?? 0;
        const gap = rawQaMatches.length >= 2
          ? topScore - (rawQaMatches[1].score ?? 0)
          : 1;
        if (gap >= 0.03 || topScore >= 0.85) {
          // Build the ChunkRecord for the match (may already exist in chunks)
          const match = rawQaMatches[0];
          directMatchChunk = chunks.get(match.id) ?? (match.metadata?.enrichedText ? {
            id: match.id,
            enrichedText: match.metadata.enrichedText as string,
            depth: (match.metadata.depth as string) ?? "surface",
            section: (match.metadata.section as string) ?? "",
            skills: (match.metadata.skills as string[]) ?? [],
            isCoreStrength: (match.metadata.is_core_strength as boolean) ?? false,
            pineconeScore: topScore,
            question: (match.metadata.question as string) || undefined,
            chunkType: (match.metadata.chunk_type as string) || undefined,
          } : null);
        }
      }

      // Merge raw QA results into chunks map (for context assembly)
      addMatchChunks(chunks, rawQaMatches);
    }

    addTrace("Direct Match", directMatchChunk
      ? `MATCH: "${directMatchChunk.question?.slice(0, 60)}" (score: ${directMatchChunk.pineconeScore.toFixed(3)})`
      : "No direct match found", {
      found: !!directMatchChunk,
      ...(directMatchChunk ? {
        matchId: directMatchChunk.id,
        matchScore: directMatchChunk.pineconeScore,
        matchQuestion: directMatchChunk.question,
      } : {}),
    });

    // 10. Persona-aware re-ranking
    const rankedWithScores = [...chunks.values()]
      .map((chunk) => ({
        chunk,
        personaScore: scoreChunk(chunk, persona, focus),
      }))
      .sort((a, b) => b.personaScore - a.personaScore)
      .slice(0, 15);
    const rankedChunks = rankedWithScores.map((r) => r.chunk);

    addTrace("Re-ranking", `${chunks.size} → ${rankedChunks.length} chunks after persona re-rank`, {
      inputCount: chunks.size,
      outputCount: rankedChunks.length,
      topChunks: rankedWithScores.slice(0, 8).map(r => ({
        id: r.chunk.id,
        label: CHUNK_LABELS[r.chunk.id] ?? r.chunk.id,
        section: r.chunk.section,
        pineconeScore: Math.round(r.chunk.pineconeScore * 1000) / 1000,
        personaMultiplier: Math.round(r.personaScore * 100) / 100,
      })),
    });

    // 11. Assemble structured context
    let context: string;

    if (directMatchChunk) {
      // Direct match mode: primary answer + limited supplementary context
      const supplementary = rankedChunks
        .filter((c) => c.id !== directMatchChunk!.id)
        .slice(0, 5);

      context = "--- PRIMARY ANSWER ---\n[PRIMARY ANSWER]\n" + directMatchChunk.enrichedText;
      if (supplementary.length > 0) {
        context +=
          "\n\n--- SUPPLEMENTARY CONTEXT ---\n" +
          supplementary.map((c) => c.enrichedText).join("\n\n");
      }
      context += "\n--- END RESUME ---";
    } else {
      // Standard mode: separate overview from deep-dive
      const overviewChunks: string[] = [];
      const deepDiveChunks: string[] = [];

      for (const chunk of rankedChunks) {
        if (chunk.depth === "deep_dive") {
          deepDiveChunks.push(chunk.enrichedText);
        } else {
          overviewChunks.push(chunk.enrichedText);
        }
      }

      context = "--- OVERVIEW ---\n" + overviewChunks.join("\n\n");
      if (deepDiveChunks.length > 0) {
        context +=
          "\n\n--- DETAILED STORIES (for follow-up depth) ---\n" +
          deepDiveChunks.join("\n\n");
      }
      context += "\n--- END RESUME ---";
    }

    addTrace("Context Assembly", directMatchChunk
      ? `Direct match mode | context: ${context.length} chars`
      : `Standard mode | ${rankedChunks.filter(c => c.depth !== "deep_dive").length} overview + ${rankedChunks.filter(c => c.depth === "deep_dive").length} deep-dive | ${context.length} chars`, {
      mode: directMatchChunk ? "direct_match" : "standard",
      contextLength: context.length,
      overviewChunks: rankedChunks.filter(c => c.depth !== "deep_dive").length,
      deepDiveChunks: rankedChunks.filter(c => c.depth === "deep_dive").length,
    });

    // 12. Log retrieval details
    if (process.env.NODE_ENV === "development") {
      console.log("[RAG] Query:", truncatedQuery);
      console.log("[RAG] Retrieval query:", retrievalQuery.slice(0, 200));
      console.log("[RAG] Detected filter:", detected);
      console.log("[RAG] Pinned IDs:", pinnedIds);
      console.log("[RAG] Persona:", persona, "Focus:", focus);
      console.log("[RAG] Retrieved chunks:", [...chunks.keys()]);
      console.log("[RAG] After re-ranking:", rankedChunks.map((c) => c.id));
      console.log("[RAG] Intent:", intent);
      if (directMatchChunk) {
        console.log(`[RAG] DIRECT MATCH: ${directMatchChunk.id} score: ${directMatchChunk.pineconeScore} question: "${directMatchChunk.question}"`);
      }
    }

    if (!skipTracking) {
      logAnalytics({
        type: "query",
        query: truncatedQuery.slice(0, 200),
        persona,
        focus,
        intent,
        chunksRetrieved: chunks.size,
        chunksAfterRerank: rankedChunks.length,
        directMatch: directMatchChunk?.id,
        directMatchScore: directMatchChunk?.pineconeScore,
        timestamp: new Date().toISOString(),
        visitorEmail,
      });
    }

    // 12. Convert UI messages to model messages (sliding window)
    const recentMessages = messages.slice(-MAX_HISTORY);
    const modelMessages = await convertToModelMessages(recentMessages);

    // 13. Load answer mode and stream response
    const answerMode = await getAnswerMode();
    const modePrompt = ANSWER_MODE_PROMPTS[answerMode];

    const systemPrompt = `You are the professional whose resume is provided below. Answer questions as if you are speaking about yourself in first person ("I", "my", "me").
Stay grounded in the facts from your resume.

${modePrompt}
${directMatchChunk ? `
DIRECT MATCH MODE:
The user's question closely matches a specific prepared answer (marked [PRIMARY ANSWER] below).
- Use the PRIMARY ANSWER as the backbone of your response — follow its structure, reasoning, and key examples.
- Preserve DJ's personal voice and specific phrasing where it's strong. You may condense or lightly restructure for readability, but don't replace his words with generic corporate language.
- You may weave in supplementary context where it genuinely strengthens the answer, but the primary answer should clearly dominate. Don't give equal weight to tangential material.
` : intent === "broad" ? `
RESPONSE MODE: OVERVIEW
This is a broad question — give a concise overview rather than diving deep into any single topic.
- Organize your response as 3-5 short bullet points covering the key areas of your background relevant to the question.
- Keep each bullet point to 1-2 sentences max.
- Your follow-up suggestions should help the visitor drill into specific topics from the overview (e.g. a specific company, a particular skill, a notable achievement).
` : ""}

LANGUAGE: Detect the language of each user message and respond in the SAME language.
- If the user writes in Korean, respond entirely in Korean.
- If the user writes in English, respond entirely in English.

STRICT ACCURACY — this is the most important rule:
- ONLY answer using information explicitly present in the resume context below. Every claim you make must be directly traceable to a specific fact in the context.
- NEVER invent, infer, or extrapolate experiences, skills, metrics, company names, dates, or details that are not explicitly stated in the context.
- If a question asks about something not covered in the context, clearly say so. Do NOT attempt a partial answer by guessing or filling in gaps.
- Do not assume skills, technologies, or achievements beyond what is listed. If the context says "partnered with Apple" do not add details about what that partnership involved unless those details are in the context.
- If the question is partially answerable, answer ONLY the part supported by the context and explicitly state what you cannot answer.
- In English: "That's not something covered in my background — happy to chat more about what I do bring to the table though!"
- In Korean: "그 부분은 제 이력서에 포함되어 있지 않지만, 제가 가진 다른 역량에 대해 더 이야기해 드릴 수 있습니다!"

SOURCE FIDELITY:
- When the context contains DJ's own words (stories, interview answers, reflections), preserve his original phrasing and reasoning as much as possible.
- Condense for length, but do NOT rephrase his words into generic or corporate language. His voice and specific examples are the answer.

PRIVACY:
- Never share phone number, home address, or exact salary even if present in the context.
- Email and LinkedIn are OK to share (they are public).

${Array.isArray(coveredTopics) && coveredTopics.length > 0
  ? `TOPICS ALREADY DISCUSSED IN THIS SESSION: ${coveredTopics.join(", ")}\n\n` : ""}FOLLOW-UP QUESTIONS:
At the very end of every response, suggest exactly 2 brief follow-up questions the visitor might want to ask next. Use a polite, professional interview tone — second person ("you/your"), e.g. "Could you tell me about..." or "How did you approach...". These must be specific to what was just discussed AND answerable from the resume context provided. Do NOT suggest questions about topics not covered in the context — only suggest questions you can actually answer well. Do NOT suggest questions about topics already discussed (listed above) — steer toward fresh, unexplored areas. Match the language of your response. Format:
<followup>
First question?
Second question?
</followup>

${PERSONA_TONE[persona]}

${FOCUS_HIGHLIGHT[focus]}

--- MY RESUME ---
${context}`;

    addTrace("Generation", `model=gemini-2.5-flash | mode=${answerMode} | ${directMatchChunk ? 'direct_match' : intent === 'broad' ? 'overview' : 'standard'}`, {
      model: "gemini-2.5-flash",
      answerMode,
      responseMode: directMatchChunk ? "direct_match" : intent === "broad" ? "overview" : "standard",
      temperature: 0.3,
      maxOutputTokens: 2048,
      contextLength: context.length,
      systemPrompt,
    });

    const result = streamText({
      model: google("gemini-2.5-flash"),
      temperature: 0.3,
      maxOutputTokens: 2048,
      abortSignal: req.signal,
      system: systemPrompt,
      messages: modelMessages,
      onFinish: ({ text }) => {
        if (!skipTracking) {
          logExchange({
            sessionId: sessionId ?? "",
            persona,
            focus,
            lang: lang ?? "en",
            query: truncatedQuery,
            response: text,
            chunksUsed: rankedChunks.map((c) => c.id),
            visitorEmail,
          });
        }
      },
    });

    // Build deduplicated, human-readable source tags from ranked chunks
    // Exclude always-pinned chunks (they appear in every response = noise)
    // Derive labels from chunk IDs for specificity, cap at 3
    const sourceTags = [
      ...new Set(
        rankedChunks
          .filter((c) => !ALWAYS_PINNED.has(c.id))
          .map((c) => CHUNK_LABELS[c.id])
          .filter(Boolean)
      ),
    ].slice(0, 3);

    return result.toUIMessageStreamResponse<ChatUIMessage>({
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            sourceTags,
            ...(isInternal ? { trace: { steps: traceSteps, totalDurationMs: Date.now() - traceStart } } : {}),
          };
        }
        return undefined;
      },
    });
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
        pineconeScore: 0,
        question: (record.metadata.question as string) || undefined,
        chunkType: (record.metadata.chunk_type as string) || undefined,
      });
    }
  }
}

function addMatchChunks(
  chunks: Map<string, ChunkRecord>,
  matches: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }>
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
        pineconeScore: match.score ?? 0,
        question: (match.metadata.question as string) || undefined,
        chunkType: (match.metadata.chunk_type as string) || undefined,
      });
    }
  }
}
