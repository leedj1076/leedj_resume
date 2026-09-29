import { generateText, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { getResumeIndex } from "@/lib/pinecone";
import { readJsonBody, errorResponse } from "@/lib/server/http";
import { parsePrototypeRequest } from "@/lib/server/chat-request";
import { admitPublicChat } from "@/lib/server/rate-limit";
import { CHAT_MODEL, EMBEDDING_MODEL } from "@/lib/domain/models";
import {
  PERSONA_TONE,
  FOCUS_HIGHLIGHT,
  PERSONA_SECTION_WEIGHTS,
  FOCUS_SKILL_TERMS,
  CORE_STRENGTH_IDS,
} from "@/lib/persona-config";
import { getAnswerMode } from "@/lib/settings";
import { ANSWER_MODE_PROMPTS } from "@/lib/answer-modes";

const BASE_PINNED_IDS = ["narrative-career-trajectory", "personal-summary"];

export async function POST(req: Request) {
  const denied = admitPublicChat(req);
  if (denied) return denied;
  try {
    const { query, persona, focus, messages } = parsePrototypeRequest(await readJsonBody(req));
    const truncatedQuery = query;

    // 1. Embed the query
    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: truncatedQuery,
    });

    // 2. Query Pinecone — semantic + pinned + focus-filtered
    const index = getResumeIndex();
    const ns = index.namespace("resume");

    const pinnedIds = [...BASE_PINNED_IDS, ...CORE_STRENGTH_IDS];
    const focusTerms = FOCUS_SKILL_TERMS[focus];
    const hasFocusFilter = focus !== "full_stack" && focusTerms.length > 0;

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
    const semanticResults = results[0] as {
      matches: Array<{ id: string; metadata?: Record<string, unknown> }>;
    };
    const pinnedResults = results[1] as {
      records: Record<string, { metadata?: Record<string, unknown> } | undefined>;
    };

    // 3. Collect chunks (dedup by ID)
    const chunks = new Map<
      string,
      { id: string; enrichedText: string; section: string; depth: string; skills: string[] }
    >();

    // Pinned first
    for (const id of pinnedIds) {
      const record = pinnedResults.records[id];
      if (record?.metadata?.enrichedText) {
        chunks.set(id, {
          id,
          enrichedText: record.metadata.enrichedText as string,
          section: (record.metadata.section as string) ?? "",
          depth: (record.metadata.depth as string) ?? "surface",
          skills: (record.metadata.skills as string[]) ?? [],
        });
      }
    }

    // Semantic matches
    for (const match of semanticResults.matches) {
      if (!chunks.has(match.id) && match.metadata?.enrichedText) {
        chunks.set(match.id, {
          id: match.id,
          enrichedText: match.metadata.enrichedText as string,
          section: (match.metadata.section as string) ?? "",
          depth: (match.metadata.depth as string) ?? "surface",
          skills: (match.metadata.skills as string[]) ?? [],
        });
      }
    }

    // Focus-filtered matches
    if (hasFocusFilter && results[2]) {
      const focusResults = results[2] as {
        matches: Array<{ id: string; metadata?: Record<string, unknown> }>;
      };
      for (const match of focusResults.matches) {
        if (!chunks.has(match.id) && match.metadata?.enrichedText) {
          chunks.set(match.id, {
            id: match.id,
            enrichedText: match.metadata.enrichedText as string,
            section: (match.metadata.section as string) ?? "",
            depth: (match.metadata.depth as string) ?? "surface",
            skills: (match.metadata.skills as string[]) ?? [],
          });
        }
      }
    }

    // 4. Persona-aware re-ranking
    const weights = PERSONA_SECTION_WEIGHTS[persona];
    const rankedChunks = [...chunks.values()]
      .map((chunk) => ({
        chunk,
        score: (weights[chunk.section] ?? 1.0) * (chunk.skills.some((s) => focusTerms.includes(s)) ? 1.25 : 1.0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((r) => r.chunk);

    // 5. Assemble context
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
      context += "\n\n--- DETAILED STORIES (for follow-up depth) ---\n" + deepDiveChunks.join("\n\n");
    }
    context += "\n--- END RESUME ---";

    // 6. Build conversation messages
    const modelMessages = messages.slice(-10).map((message) => ({ role: message.role, content: message.parts[0].text }));

    // 7. Load answer mode and generate response (non-streaming)
    const answerMode = await getAnswerMode();
    const modePrompt = ANSWER_MODE_PROMPTS[answerMode];

    const { text } = await generateText({
      model: openai(CHAT_MODEL),
      maxOutputTokens: 2048,
      system: `You are the professional whose resume is provided below. Answer questions as if you are speaking about yourself in first person ("I", "my", "me").
Stay grounded in the facts from your resume.

${modePrompt}

LANGUAGE: Detect the language of each user message and respond in the SAME language.

STRICT ACCURACY:
- ONLY answer using information explicitly present in the resume context below.
- NEVER invent, infer, or extrapolate details not in the context.
- If a question asks about something not covered, clearly say so.

PRIVACY:
- Never share phone number, home address, or exact salary.
- Email and LinkedIn are OK to share.

${PERSONA_TONE[persona]}

${FOCUS_HIGHLIGHT[focus]}

--- MY RESUME ---
${context}`,
      messages: modelMessages,
    });

    return Response.json({
      response: text,
      chunksUsed: rankedChunks.map((c) => c.id),
    });
  } catch (error) {
    console.error("[UI-CHAT] Error:", error);
    return errorResponse(error);
  }
}
