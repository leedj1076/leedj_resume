import { FOCUS_SKILL_TERMS, PERSONA_SECTION_WEIGHTS, getSuppressedChunkIds, personaChunkAdjustment } from "../persona-config";
import type { VisitorData } from "../domain/personas";
import type { ChunkRecord, EvidenceSelection, RewriteResult } from "./types";

const MAX_RANKED_CHUNKS = 15;
const DIRECT_THRESHOLD = 0.72;
const DIRECT_GAP = 0.03;
const STRONG_DIRECT_THRESHOLD = 0.85;
const MAX_DIRECT_PERSONA_ADJUSTMENT = 1.0;

function scoreChunk(chunk: ChunkRecord, visitor: VisitorData): number {
  const sectionWeight = PERSONA_SECTION_WEIGHTS[visitor.persona][chunk.section] ?? 1.0;
  const coreStrengthBonus = chunk.isCoreStrength ? 1.3 : 1.0;
  const focusTerms = FOCUS_SKILL_TERMS[visitor.focus];
  const focusMatchBonus = visitor.focus !== "full_stack" && chunk.skills.some(skill => focusTerms.includes(skill)) ? 1.25 : 1.0;
  return sectionWeight * coreStrengthBonus * focusMatchBonus * personaChunkAdjustment(visitor.persona, chunk);
}

export function selectEvidence(
  chunks: readonly ChunkRecord[],
  rawMatches: readonly ChunkRecord[],
  visitor: VisitorData,
  intent: RewriteResult["intent"],
): EvidenceSelection {
  const suppressed = getSuppressedChunkIds(visitor.persona);
  const droppedSuppressedIds = [...new Set([...chunks, ...rawMatches].filter(chunk => suppressed.has(chunk.id)).map(chunk => chunk.id))];
  const candidates = new Map<string, ChunkRecord>();
  for (const chunk of chunks) if (!suppressed.has(chunk.id) && !candidates.has(chunk.id)) candidates.set(chunk.id, chunk);

  let directMatchChunk: ChunkRecord | null = null;
  if (intent !== "broad" && rawMatches.length > 0) {
    const dampened = rawMatches
      .filter(chunk => !suppressed.has(chunk.id))
      .map(chunk => ({ chunk, adjustedScore: chunk.pineconeScore * Math.min(MAX_DIRECT_PERSONA_ADJUSTMENT, personaChunkAdjustment(visitor.persona, chunk)) }))
      .sort((a, b) => b.adjustedScore - a.adjustedScore);
    if (dampened.length > 0 && dampened[0].adjustedScore >= DIRECT_THRESHOLD) {
      const gap = dampened.length > 1 ? dampened[0].adjustedScore - dampened[1].adjustedScore : 1;
      if (gap >= DIRECT_GAP || dampened[0].adjustedScore >= STRONG_DIRECT_THRESHOLD) {
        directMatchChunk = candidates.get(dampened[0].chunk.id) ?? dampened[0].chunk;
      }
    }
    for (const chunk of rawMatches) if (!suppressed.has(chunk.id) && !candidates.has(chunk.id)) candidates.set(chunk.id, chunk);
  }

  const rankedChunks = [...candidates.values()]
    .map(chunk => ({ chunk, personaScore: scoreChunk(chunk, visitor) }))
    .sort((a, b) => b.personaScore - a.personaScore)
    .slice(0, MAX_RANKED_CHUNKS)
    .map(result => result.chunk);
  return { rankedChunks, rankingInputCount: candidates.size, directMatchChunk, droppedSuppressedIds };
}
