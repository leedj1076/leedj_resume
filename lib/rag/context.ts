import type { ContextResult, EvidenceSelection } from "./types";

const MAX_SUPPLEMENTS = 5;

export function assembleContext(selection: EvidenceSelection): ContextResult {
  const primary = selection.directMatchChunk;
  if (primary) {
    const supplements = selection.rankedChunks
      .filter((chunk) => chunk.id !== primary.id)
      .slice(0, MAX_SUPPLEMENTS);
    const text =
      "--- PRIMARY ANSWER ---\n[PRIMARY ANSWER]\n" +
      primary.enrichedText +
      (supplements.length
        ? "\n\n--- SUPPLEMENTARY CONTEXT ---\n" +
          supplements.map((chunk) => chunk.enrichedText).join("\n\n")
        : "") +
      "\n--- END RESUME ---";
    return {
      text,
      usedChunks: [primary, ...supplements],
      primaryChunkId: primary.id,
    };
  }

  const overview = selection.rankedChunks.filter(
    (chunk) => chunk.depth !== "deep_dive",
  );
  const detailed = selection.rankedChunks.filter(
    (chunk) => chunk.depth === "deep_dive",
  );
  const text =
    "--- OVERVIEW ---\n" +
    overview.map((chunk) => chunk.enrichedText).join("\n\n") +
    (detailed.length
      ? "\n\n--- DETAILED STORIES (for follow-up depth) ---\n" +
        detailed.map((chunk) => chunk.enrichedText).join("\n\n")
      : "") +
    "\n--- END RESUME ---";
  return { text, usedChunks: [...overview, ...detailed], primaryChunkId: null };
}
