import { z } from "zod";
import { GeneratedKnowledgeEntrySchema, NewKnowledgeEntrySchema, type KnowledgeEntry } from "../domain/knowledge";
import type { InterviewExchange } from "../chat/transcript";

export type KnowledgeGenerator = (exchange: InterviewExchange) => Promise<unknown>;

function estimateTokens(text: string): number {
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  return Math.ceil((text.length - koreanChars) / 4 + koreanChars / 2);
}

export async function structureKnowledge(
  exchanges: readonly InterviewExchange[],
  generate: KnowledgeGenerator,
): Promise<KnowledgeEntry[]> {
  const entries: KnowledgeEntry[] = [];
  const generatedArray = z.array(GeneratedKnowledgeEntrySchema);
  const ids = new Set<string>();
  for (const exchange of exchanges) {
    if (!exchange.question.trim() || !exchange.answer.trim()) throw new Error("Interview exchange requires a question and answer");
    const generated = generatedArray.parse(await generate(exchange));
    for (const entry of generated) {
      if (ids.has(entry.chunk_id)) throw new Error(`Duplicate generated chunk_id: ${entry.chunk_id}`);
      ids.add(entry.chunk_id);
      entries.push(NewKnowledgeEntrySchema.parse({ ...entry, token_count: estimateTokens(entry.text) }));
    }
  }
  return entries;
}
