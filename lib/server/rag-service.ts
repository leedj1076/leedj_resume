import { convertToModelMessages } from "ai";
import type { ChatRequest } from "./chat-request";
import type { ContextResult, ChunkRecord, RewriteResult } from "../rag/types";
import { parseRewrite, buildRetrievalPlan } from "../rag/retrieval-plan";
import { selectEvidence } from "../rag/selection";
import { assembleContext } from "../rag/context";
import { buildSystemPrompt } from "../rag/prompts";
import { getSourceTags, CHUNK_LABELS } from "../rag/labels";
import { detectFilter } from "../entity-detection";
import { ANSWER_MODE_PROMPTS } from "../answer-modes";
import type { AnswerMode } from "../answer-modes";
import { CHAT_MODEL, EMBEDDING_MODEL } from "../domain/models";
import {
  embedQuery,
  fetchChunks,
  readAnswerMode,
  rewriteQuery,
  searchChunks,
} from "./providers";
import type { TraceData, TraceStep } from "../rag/trace";

export interface PreparedAnswer {
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  context: ContextResult;
  prompt: string;
  trace: TraceData;
  intent: RewriteResult["intent"];
  originalQuery: string;
  retrievalQuery: string;
  clarification?: string;
  sourceTags: string[];
  chunksRetrieved: number;
  chunksAfterRerank: number;
  directMatchId?: string;
  directMatchScore?: number;
}

type ChatOnly = Extract<ChatRequest, { type: "chat" }>;

function textOf(message: ChatOnly["messages"][number]): string {
  return message.parts.map((part) => part.text).join("");
}

function fallbackQuery(query: string, messages: ChatOnly["messages"]): string {
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      const context = textOf(messages[i]).split(/\s+/).slice(0, 100).join(" ");
      return context ? `${context} ${query}` : query;
    }
  }
  return query;
}

function rewritePrompt(query: string, messages: ChatOnly["messages"]): string {
  const history =
    messages.length > 2
      ? messages
          .slice(-4, -1)
          .map(
            (message) =>
              `${message.role}: ${textOf(message).split(/\s+/).slice(0, 50).join(" ")}`,
          )
          .join("\n")
      : "";
  return `You are a search query optimizer for a professional resume database about Dong Jae Lee.

Analyze the visitor's question (and optional conversation context) and return a JSON object:
{
  "intent": "specific" | "broad" | "ambiguous",
  "query": "keyword-rich search query for embedding retrieval",
  "clarifications": ["option 1?", "option 2?"]
}

Intent rules:
- "specific": question targets a known topic, company, role, skill, or story (e.g. "How did you build the Apple partnership?", "What was your role at Flint?")
- "broad": question covers a wide area (e.g. "tell me about yourself", "what's your background?", "what's your experience?", "자기소개 해주세요")
- "ambiguous": the QUESTION ITSELF is unclear — vague pronouns with no referent, or too vague to know what is being asked (e.g. "how about that thing?", "what do you think?", "그거 어떻게 했어요?" without prior context). Do NOT mark a clear question "ambiguous" just because it falls outside DJ's resume — hypotheticals, personal motivations, or topics not in his background should be classified "specific" so they can be answered from context or honestly declined, NOT sent back for clarification.

Query rules:
- Expand vague references: "your startup" → "Flint Technologies co-founder COO startup", "gaming company" → "Devs United Games XR spatial computing"
- Include relevant proper nouns, role titles, company names, and domain terms
- Resolve pronouns using conversation context
- Keep the query under 50 words
- For broad intent, make the query cover the main career areas

Clarifications: only populate when intent is "ambiguous". Provide 2-3 clarifying questions that would help narrow down the answer. Write them in the same language as the user's question.

Output ONLY valid JSON, no markdown fences or extra text.

${history ? `Recent conversation:\n${history}\n` : ""}User question: ${query}`;
}

function orderedUnique(groups: readonly ChunkRecord[][]): ChunkRecord[] {
  const seen = new Set<string>();
  return groups.flat().filter((chunk) => {
    if (seen.has(chunk.id)) return false;
    seen.add(chunk.id);
    return true;
  });
}

export async function prepareAnswer(
  request: ChatOnly,
  signal: AbortSignal,
  options: { answerMode?: AnswerMode } = {},
): Promise<PreparedAnswer> {
  const start = Date.now();
  const steps: TraceStep[] = [];
  const add = <T extends TraceStep>(step: Omit<T, "timestamp">) =>
    steps.push({ ...step, timestamp: Date.now() - start } as T);
  const query = textOf(request.messages.at(-1)!).slice(0, 2000);
  signal.throwIfAborted();
  add({
    type: "query",
    summary: `Question from ${request.visitorData.persona}`,
    data: {
      rawQuery: query.slice(0, 200),
      persona: request.visitorData.persona,
      focus: request.visitorData.focus,
      lang: request.lang,
      messageCount: request.messages.length,
    },
  });
  const detected = detectFilter(query);
  add({
    type: "entity",
    summary: detected ? `Found ${detected.type}` : "No entity detected",
    data: { detected },
  });
  const promptForRewrite = rewritePrompt(query, request.messages);
  add({
    type: "rewrite-prompt",
    summary: `Sent to ${CHAT_MODEL}`,
    data: { prompt: promptForRewrite, model: CHAT_MODEL },
  });
  let rawRewrite = "";
  try {
    rawRewrite = await rewriteQuery(promptForRewrite, signal);
  } catch (error) {
    if (signal.aborted) throw error;
  }
  signal.throwIfAborted();
  const rewritten = parseRewrite(
    rawRewrite,
    fallbackQuery(query, request.messages),
  );
  add({
    type: "rewrite",
    summary: `${rewritten.intent}: ${rewritten.query.slice(0, 100)}`,
    data: {
      rawResult: rawRewrite || "(fallback — no rewrite result)",
      rewrittenQuery: rewritten.query,
      originalQuery: query,
      intent: rewritten.intent,
      clarifications: rewritten.clarifications,
    },
  });
  const messages = await convertToModelMessages(request.messages.slice(-10));
  signal.throwIfAborted();
  if (rewritten.intent === "ambiguous" && rewritten.clarifications.length) {
    const opening =
      request.lang === "ko"
        ? "정확한 답변을 드리고 싶은데요, 어떤 부분이 궁금하신지 좀 더 알려주시겠어요?"
        : "I'd like to give you a specific answer! Could you help me narrow it down?";
    const clarification = `${opening}\n\n<followup>\n${rewritten.clarifications.join("\n")}\n</followup>`;
    add({
      type: "ambiguity",
      summary: "Clarification requested before retrieval",
      data: { clarifications: rewritten.clarifications },
    });
    return {
      messages,
      context: { text: "", usedChunks: [], primaryChunkId: null },
      prompt: "",
      trace: { steps, totalDurationMs: Date.now() - start },
      intent: rewritten.intent,
      originalQuery: query,
      retrievalQuery: rewritten.query,
      clarification,
      sourceTags: [],
      chunksRetrieved: 0,
      chunksAfterRerank: 0,
    };
  }

  const plan = buildRetrievalPlan({
    query,
    visitor: request.visitorData,
    intent: rewritten.intent,
  });
  const vector = await embedQuery(rewritten.query.slice(0, 2000), signal);
  signal.throwIfAborted();
  const rawVector =
    rewritten.intent !== "broad" && rewritten.query !== query
      ? await embedQuery(query, signal)
      : vector;
  signal.throwIfAborted();
  add({
    type: "embedding",
    summary: `Embedded ${rewritten.query.length} characters`,
    data: {
      model: EMBEDDING_MODEL,
      queryLength: rewritten.query.length,
      embeddingDimensions: vector.length,
      hasRawEmbedding: rawVector !== vector,
    },
  });

  // Names keep the result attached to its source even as optional branches vary.
  const semanticRequest = searchChunks(
    { vector, topK: plan.semanticTopK },
    signal,
  );
  const filteredRequest =
    plan.filter && plan.filteredTopK
      ? searchChunks(
          { vector, topK: plan.filteredTopK, filter: plan.filter },
          signal,
        )
      : Promise.resolve([]);
  const pinnedRequest = fetchChunks(plan.pinnedIds, signal);
  const focusedRequest =
    plan.focusFilter && plan.focusTopK
      ? searchChunks(
          { vector, topK: plan.focusTopK, filter: plan.focusFilter },
          signal,
        )
      : Promise.resolve([]);
  const [semantic, filtered, pinned, focused] = await Promise.all([
    semanticRequest,
    filteredRequest,
    pinnedRequest,
    focusedRequest,
  ]);
  signal.throwIfAborted();
  const candidates = orderedUnique([pinned, filtered, semantic, focused]);
  add({
    type: "retrieval",
    summary: `${candidates.length} chunks retrieved`,
    data: {
      totalChunks: candidates.length,
      filterType: plan.kind === "general" ? "none" : plan.kind,
      filterValue: plan.filterValue,
      pinnedIds: plan.pinnedIds,
      hasFocusFilter: Boolean(plan.focusFilter),
      chunkIds: candidates.map((chunk) => chunk.id),
      topScores: [...candidates]
        .sort((a, b) => b.pineconeScore - a.pineconeScore)
        .slice(0, 5)
        .map((chunk) => ({
          id: chunk.id,
          score: chunk.pineconeScore,
          section: chunk.section,
        })),
    },
  });
  const rawMatches = plan.rawQaTopK
    ? await searchChunks(
        {
          vector: rawVector,
          topK: plan.rawQaTopK,
          filter: { chunk_type: { $eq: "qa_story" } },
        },
        signal,
      )
    : [];
  signal.throwIfAborted();
  const selection = selectEvidence(
    candidates,
    rawMatches,
    request.visitorData,
    rewritten.intent,
  );
  const direct = selection.directMatchChunk;
  add({
    type: "direct-match",
    summary: direct ? `Matched ${direct.id}` : "No direct match",
    data: {
      found: Boolean(direct),
      matchId: direct?.id,
      matchScore: direct?.pineconeScore,
      matchQuestion: direct?.question,
    },
  });
  if (selection.droppedSuppressedIds.length)
    add({
      type: "suppression",
      summary: `${selection.droppedSuppressedIds.length} chunks suppressed`,
      data: {
        persona: request.visitorData.persona,
        dropped: selection.droppedSuppressedIds,
      },
    });
  add({
    type: "ranking",
    summary: `${selection.rankingInputCount} → ${selection.rankedChunks.length} chunks`,
    data: {
      inputCount: selection.rankingInputCount,
      outputCount: selection.rankedChunks.length,
      topChunks: selection.rankedChunks.slice(0, 8).map((chunk) => ({
        id: chunk.id,
        label: CHUNK_LABELS[chunk.id] ?? chunk.id,
        section: chunk.section,
        pineconeScore: chunk.pineconeScore,
      })),
    },
  });
  const context = assembleContext(selection);
  add({
    type: "context",
    summary: `${context.usedChunks.length} chunks in context`,
    data: {
      mode: direct ? "direct_match" : "standard",
      contextLength: context.text.length,
      overviewChunks: context.usedChunks.filter(
        (chunk) => chunk.depth !== "deep_dive",
      ).length,
      deepDiveChunks: context.usedChunks.filter(
        (chunk) => chunk.depth === "deep_dive",
      ).length,
      usedChunkIds: context.usedChunks.map((chunk) => chunk.id),
    },
  });
  const answerMode = options.answerMode ?? (await readAnswerMode());
  signal.throwIfAborted();
  const prompt = buildSystemPrompt({
    context: context.text,
    visitor: request.visitorData,
    intent: rewritten.intent,
    primaryChunkId: context.primaryChunkId,
    modePrompt: ANSWER_MODE_PROMPTS[answerMode],
    coveredTopics: request.coveredTopics,
  });
  add({
    type: "generation",
    summary: `Model ${CHAT_MODEL}, mode ${answerMode}`,
    data: {
      model: CHAT_MODEL,
      answerMode,
      responseMode: direct
        ? "direct_match"
        : rewritten.intent === "broad"
          ? "overview"
          : "standard",
      maxOutputTokens: 2048,
      contextLength: context.text.length,
      systemPrompt: prompt,
    },
  });
  return {
    messages,
    context,
    prompt,
    trace: { steps, totalDurationMs: Date.now() - start },
    intent: rewritten.intent,
    originalQuery: query,
    retrievalQuery: rewritten.query,
    sourceTags: getSourceTags(context.usedChunks),
    chunksRetrieved: candidates.length,
    chunksAfterRerank: selection.rankedChunks.length,
    directMatchId: direct?.id,
    directMatchScore: direct?.pineconeScore,
  };
}
