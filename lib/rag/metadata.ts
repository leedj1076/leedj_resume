import type { ChunkRecord } from "./types";

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

/** Validate a provider record once, before any policy code sees it. */
export function normalizeChunk(id: string, metadata: unknown, score: number): ChunkRecord | null {
  if (!id || !Number.isFinite(score) || metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const fields = metadata as Record<string, unknown>;
  if (typeof fields.enrichedText !== "string" || !fields.enrichedText.trim()) return null;
  if (!optionalString(fields.depth) || !optionalString(fields.section) ||
      (fields.skills !== undefined && (!Array.isArray(fields.skills) || !fields.skills.every((skill: unknown) => typeof skill === "string"))) ||
      (fields.is_core_strength !== undefined && typeof fields.is_core_strength !== "boolean") ||
      !optionalString(fields.question) || !optionalString(fields.chunk_type)) return null;

  return {
    id,
    enrichedText: fields.enrichedText,
    depth: fields.depth ?? "surface",
    section: fields.section ?? "",
    skills: fields.skills ?? [],
    isCoreStrength: fields.is_core_strength ?? false,
    pineconeScore: score,
    question: fields.question || undefined,
    chunkType: fields.chunk_type || undefined,
  } as ChunkRecord;
}
