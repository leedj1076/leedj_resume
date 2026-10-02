import { embed, generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { CHAT_MODEL, EMBEDDING_MODEL } from "../domain/models";
import { normalizeChunk } from "../rag/metadata";
import type { ChunkRecord } from "../rag/types";
import type { AnswerMode } from "../answer-modes";

type SearchInput = {
  vector: number[];
  topK: number;
  filter?: Record<string, unknown>;
};

export async function rewriteQuery(
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  const result = await generateText({
    model: openai(CHAT_MODEL),
    maxOutputTokens: 1000,
    prompt,
    abortSignal: signal,
  });
  return result.text;
}

export async function embedQuery(
  value: string,
  signal: AbortSignal,
): Promise<number[]> {
  const result = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value,
    abortSignal: signal,
  });
  return result.embedding;
}

export async function searchChunks(
  input: SearchInput,
  signal: AbortSignal,
): Promise<ChunkRecord[]> {
  signal.throwIfAborted();
  const { getResumeIndex } = await import("../pinecone");
  const result = await getResumeIndex().namespace("resume").query({
    vector: input.vector,
    topK: input.topK,
    includeMetadata: true,
    filter: input.filter,
  });
  signal.throwIfAborted();
  return result.matches.flatMap((match) => {
    const chunk = normalizeChunk(match.id, match.metadata, match.score ?? 0);
    return chunk ? [chunk] : [];
  });
}

export async function fetchChunks(
  ids: string[],
  signal: AbortSignal,
): Promise<ChunkRecord[]> {
  signal.throwIfAborted();
  const { getResumeIndex } = await import("../pinecone");
  const result = await getResumeIndex().namespace("resume").fetch({ ids });
  signal.throwIfAborted();
  return ids.flatMap((id) => {
    const chunk = normalizeChunk(id, result.records[id]?.metadata, 0);
    return chunk ? [chunk] : [];
  });
}

export async function readAnswerMode(): Promise<AnswerMode> {
  const { getAnswerMode } = await import("../settings");
  return getAnswerMode();
}

export function streamAnswer(options: {
  system: string;
  messages: ModelMessage[];
  maxOutputTokens: number;
  signal: AbortSignal;
  onFinish?: (text: string) => void;
}) {
  return streamText({
    model: openai(CHAT_MODEL),
    system: options.system,
    messages: options.messages,
    maxOutputTokens: options.maxOutputTokens,
    abortSignal: options.signal,
    onFinish: ({ text }) => options.onFinish?.(text),
  });
}

export async function generateAnswer(
  options:
    | { prompt: string; maxOutputTokens: number; signal: AbortSignal }
    | {
        system: string;
        messages: ModelMessage[];
        maxOutputTokens: number;
        signal: AbortSignal;
      },
): Promise<string> {
  const result = await generateText({
    model: openai(CHAT_MODEL),
    maxOutputTokens: options.maxOutputTokens,
    abortSignal: options.signal,
    ...("prompt" in options
      ? { prompt: options.prompt }
      : { system: options.system, messages: options.messages }),
  });
  return result.text;
}
