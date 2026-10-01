export type TraceStep =
  | { type: "query"; timestamp: number; summary: string; data: { rawQuery: string; persona: string; focus: string; lang: string; messageCount: number } }
  | { type: "entity"; timestamp: number; summary: string; data: { detected: unknown } }
  | { type: "rewrite-prompt"; timestamp: number; summary: string; data: { prompt: string; model: string } }
  | { type: "rewrite"; timestamp: number; summary: string; data: { rawResult: string; rewrittenQuery: string; originalQuery: string; intent: string; clarifications: string[] } }
  | { type: "ambiguity"; timestamp: number; summary: string; data: { clarifications: string[] } }
  | { type: "embedding"; timestamp: number; summary: string; data: { model: string; queryLength: number; embeddingDimensions: number; hasRawEmbedding: boolean } }
  | { type: "retrieval"; timestamp: number; summary: string; data: { totalChunks: number; filterType: string; filterValue?: string; pinnedIds: string[]; hasFocusFilter: boolean; chunkIds: string[]; topScores: Array<{ id: string; score: number; section: string }> } }
  | { type: "direct-match"; timestamp: number; summary: string; data: { found: boolean; matchId?: string; matchScore?: number; matchQuestion?: string } }
  | { type: "suppression"; timestamp: number; summary: string; data: { persona: string; dropped: string[] } }
  | { type: "ranking"; timestamp: number; summary: string; data: { inputCount: number; outputCount: number; topChunks: Array<{ id: string; label: string; section: string; pineconeScore: number; personaMultiplier: number }> } }
  | { type: "context"; timestamp: number; summary: string; data: { mode: string; contextLength: number; overviewChunks: number; deepDiveChunks: number; usedChunkIds: string[] } }
  | { type: "generation"; timestamp: number; summary: string; data: { model: string; answerMode: string; responseMode: string; maxOutputTokens: number; contextLength: number; systemPrompt: string } };

export interface TraceData { steps: TraceStep[]; totalDurationMs: number }

export const TRACE_LABELS: Record<TraceStep["type"], string> = {
  query: "Query Processing", entity: "Entity Detection", "rewrite-prompt": "Query Rewrite Prompt",
  rewrite: "Query Rewrite Result", ambiguity: "Early Return", embedding: "Embedding",
  retrieval: "Retrieval", "direct-match": "Direct Match", suppression: "Suppression",
  ranking: "Re-ranking", context: "Context Assembly", generation: "Generation",
};
