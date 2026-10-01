import type { VisitorData } from "../domain/personas";

export interface ChunkRecord {
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

export interface RewriteResult {
  query: string;
  intent: "specific" | "broad" | "ambiguous";
  clarifications: string[];
}

export interface RetrievalPlan {
  kind: "company" | "temporal" | "section" | "general";
  semanticTopK: number;
  filteredTopK: number | null;
  filter: Record<string, unknown> | null;
  filterValue: string | undefined;
  pinnedIds: string[];
  focusTopK: number | null;
  focusFilter: Record<string, unknown> | null;
  rawQaTopK: number | null;
}

export interface EvidenceSelection {
  rankedChunks: ChunkRecord[];
  directMatchChunk: ChunkRecord | null;
  droppedSuppressedIds: string[];
}

export interface ContextResult {
  text: string;
  usedChunks: ChunkRecord[];
  primaryChunkId: string | null;
}

export interface PromptInput {
  context: string;
  visitor: VisitorData;
  intent: RewriteResult["intent"];
  primaryChunkId: string | null;
  modePrompt: string;
  coveredTopics: readonly string[];
}
