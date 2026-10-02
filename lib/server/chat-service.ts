import { createUIMessageStreamResponse } from "ai";
import {
  CORE_STRENGTH_IDS,
  PERSONA_TONE,
  FOCUS_HIGHLIGHT,
} from "../persona-config";
import { logAnalytics, logExchange } from "../analytics";
import { sendNewSessionAlert } from "../email";
import type { ChatUIMessage } from "../types";
import type { ChatRequest } from "./chat-request";
import { prepareAnswer } from "./rag-service";
import { fetchChunks, generateAnswer, streamAnswer } from "./providers";

function clarificationStream(
  fullText: string,
  metadata: ChatUIMessage["metadata"],
): Response {
  const id = "ambiguous-text";
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "start" });
      controller.enqueue({ type: "start-step" });
      controller.enqueue({ type: "text-start", id });
      controller.enqueue({ type: "text-delta", id, delta: fullText });
      controller.enqueue({ type: "text-end", id });
      controller.enqueue({ type: "finish-step" });
      controller.enqueue({
        type: "finish",
        finishReason: "stop",
        messageMetadata: metadata,
      });
      controller.close();
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function handleChat(
  request: ChatRequest,
  options: { signal: AbortSignal; internal: boolean },
): Promise<Response> {
  const startedAt = Date.now();
  const { signal, internal } = options;
  signal.throwIfAborted();
  const { persona, focus } = request.visitorData;
  if (request.type === "init") {
    const highlights = await fetchChunks(CORE_STRENGTH_IDS, signal);
    signal.throwIfAborted();
    const context = highlights.map((chunk) => chunk.enrichedText).join("\n\n");
    const language = request.lang === "ko" ? "Korean" : "English";
    const welcome = await generateAnswer({
      maxOutputTokens: 300,
      signal,
      prompt: `You are the professional whose resume is provided below. Write a warm, personalized 2-3 sentence welcome message in ${language}.\n${PERSONA_TONE[persona]}\n${FOCUS_HIGHLIGHT[focus]}\n\nKeep it conversational — like greeting someone at a networking event. Highlight 1-2 of your most relevant strengths for this visitor type. End with an invitation to ask questions.\nONLY mention facts explicitly stated in the resume highlights below. Do not invent or embellish any details.\n\n--- RESUME HIGHLIGHTS ---\n${context}\n--- END ---`,
    });
    signal.throwIfAborted();
    if (!internal)
      logAnalytics({
        type: "init",
        sessionId: request.sessionId ?? "",
        persona,
        focus,
        lang: request.lang,
        timestamp: new Date().toISOString(),
        visitorEmail: request.visitorEmail,
      });
    return Response.json({ welcome });
  }

  const prepared = await prepareAnswer(request, signal);
  signal.throwIfAborted();
  const metadata = () => ({
    sourceTags: prepared.sourceTags,
    ...(internal
      ? {
          trace: { ...prepared.trace, totalDurationMs: Date.now() - startedAt },
        }
      : {}),
  });
  if (!internal) {
    if (request.messages.length === 1)
      sendNewSessionAlert({
        query: prepared.originalQuery,
        persona,
        focus,
        lang: request.lang,
        sessionId: request.sessionId ?? "",
        visitorEmail: request.visitorEmail,
      });
    logAnalytics({
      type: "query",
      sessionId: request.sessionId ?? "",
      query: prepared.originalQuery.slice(0, 200),
      persona,
      focus,
      intent: prepared.intent,
      chunksRetrieved: prepared.chunksRetrieved,
      chunksAfterRerank: prepared.chunksAfterRerank,
      directMatch: prepared.directMatchId,
      directMatchScore: prepared.directMatchScore,
      timestamp: new Date().toISOString(),
      visitorEmail: request.visitorEmail,
    });
  }
  const recordExchange = (text: string) => {
    if (internal || signal.aborted) return;
    logExchange({
      sessionId: request.sessionId ?? "",
      persona,
      focus,
      lang: request.lang,
      query: prepared.originalQuery,
      response: text,
      chunksUsed: prepared.context.usedChunks.map((chunk) => chunk.id),
      visitorEmail: request.visitorEmail,
      source: request.source,
    });
  };
  if (prepared.clarification) {
    recordExchange(prepared.clarification);
    return clarificationStream(prepared.clarification, metadata());
  }
  const result = streamAnswer({
    system: prepared.prompt,
    messages: prepared.messages,
    maxOutputTokens: 2048,
    signal,
    onFinish: recordExchange,
  });
  return result.toUIMessageStreamResponse<ChatUIMessage>({
    messageMetadata: ({ part }) =>
      part.type === "finish" ? metadata() : undefined,
  });
}
