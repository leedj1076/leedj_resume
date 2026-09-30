import { generateObject, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parseTranscript, toInterviewExchanges, type TranscriptFormat } from "../lib/chat/transcript";
import { GeneratedKnowledgeEntrySchema, KnowledgeEntrySchema, type KnowledgeEntry } from "../lib/domain/knowledge";
import { structureKnowledge, type KnowledgeGenerator } from "../lib/server/knowledge-structuring";

const STRUCTURING_PROMPT = `You are a knowledge structuring agent. Given a raw interview exchange between
an interviewer and DJ (Dong Jae Lee), extract structured knowledge entries.

INPUT: A Q&A exchange from the interview transcript.

OUTPUT: A JSON object matching the provided schema exactly.

RULES:
- Preserve DJ's voice and personality. Don't sanitize into corporate-speak.
- If the answer contains multiple distinct points that could each answer a different recruiter question, you MUST split into separate entries by returning an array.
- The "question" field should be the question a recruiter would naturally ask that this answer addresses — not necessarily the interviewer's exact words.
- "answer_summary" is used for retrieval matching (keep it dense with keywords, 1-2 sentences, 50 tokens max). "text" is shown to the end user (keep it conversational and rich, 150-400 tokens).
- Write "text" in third person referring to "Dong Jae Lee" (matching existing resume entries).
- Set "is_core_strength" to true ONLY for truly standout achievements with strong metrics.
- "focus_tags" can contain multiple values if the answer spans areas. Use ONLY these values: "business_development", "ai_llms", "leadership_strategy", "full_stack".
- "section" must match the existing sections: experience, skills, project, education, leadership, awards, narrative, stories, summary, motivation, career_transition, founder_philosophy, failure_learning, founder_empathy, investment_philosophy, final_40_resume_narrative, deep_dive_changjo_2026, deep_dive_career_pattern, deep_dive_flint_failure.
- "chunk_id" must be a unique lowercase slug with hyphens (e.g., "story-flint-pivot-decision").
- "depth" should be "deep_dive" for detailed stories with specifics, "surface" for overview-level facts.
- For company/role/dates: infer from context. If not clear, set to null.
- If the exchange is too vague or uninformative to create a quality entry, return an empty array.`;

export interface ProcessTranscriptOptions {
  inputPath: string;
  knowledgePath: string;
  resumePath: string;
  format: TranscriptFormat;
  generate: KnowledgeGenerator;
  skipDedup?: boolean;
  isDuplicate?: (text: string, existing: readonly KnowledgeEntry[]) => Promise<boolean>;
  rename?: typeof renameSync;
}

function readEntries(path: string): KnowledgeEntry[] {
  if (!existsSync(path)) return [];
  return KnowledgeEntrySchema.array().parse(JSON.parse(readFileSync(path, "utf8")));
}

function writeAtomically(path: string, entries: readonly KnowledgeEntry[], rename: typeof renameSync): void {
  const tempPath = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    writeFileSync(tempPath, JSON.stringify(entries, null, 2) + "\n", { flag: "wx" });
    rename(tempPath, path);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
}

export async function processTranscriptFile(options: ProcessTranscriptOptions): Promise<KnowledgeEntry[]> {
  const { inputPath, knowledgePath, resumePath, format, generate } = options;
  // Parse before provider setup or writes. Unknown formats never become a whole-document prompt.
  const exchanges = toInterviewExchanges(parseTranscript(readFileSync(inputPath, "utf8"), format));
  if (!exchanges.length) throw new Error("Transcript has no completed interviewer/subject exchanges");
  const existingKnowledge = readEntries(knowledgePath);
  const existingResume = readEntries(resumePath);
  const existing = [...existingResume, ...existingKnowledge];
  const existingIds = new Set<string>();
  for (const entry of existing) {
    if (existingIds.has(entry.chunk_id)) throw new Error(`Duplicate existing chunk_id: ${entry.chunk_id}`);
    existingIds.add(entry.chunk_id);
  }

  const generated = await structureKnowledge(exchanges, generate);
  for (const entry of generated) {
    if (existingIds.has(entry.chunk_id)) throw new Error(`Duplicate chunk_id with existing knowledge: ${entry.chunk_id}`);
  }
  const accepted: KnowledgeEntry[] = [];
  for (const entry of generated) {
    const isDuplicate = !options.skipDedup && options.isDuplicate
      ? await options.isDuplicate(entry.text, [...existing, ...accepted])
      : false;
    if (!isDuplicate) accepted.push(entry);
  }
  if (accepted.length) {
    const merged = KnowledgeEntrySchema.array().parse([...existingKnowledge, ...accepted]);
    writeAtomically(knowledgePath, merged, options.rename ?? renameSync);
  }
  return accepted;
}

async function checkDuplicate(text: string, existing: readonly KnowledgeEntry[]): Promise<boolean> {
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName || existing.length === 0) return false;
  if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is required for deduplication; use --skip-dedup to bypass it");
  const { embedding } = await embed({ model: openai.embedding("text-embedding-3-large"), value: text });
  const index = new Pinecone().index(indexName).namespace("resume");
  const results = await index.query({ vector: embedding, topK: 1, includeMetadata: false });
  return (results.matches[0]?.score ?? 0) > 0.9;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputFlag = args.indexOf("--input");
  const formatFlag = args.indexOf("--format");
  const inputPath = inputFlag >= 0 ? args[inputFlag + 1] : undefined;
  const requestedFormat = formatFlag >= 0 ? args[formatFlag + 1] : "auto";
  if (!inputPath || !["auto", "capture-legacy", "qa"].includes(requestedFormat)) {
    throw new Error("Usage: npm run structure -- --input <transcript> [--format capture-legacy|qa] [--skip-dedup]");
  }
  const format = requestedFormat as TranscriptFormat;
  const root = join(__dirname, "..");
  const entries = await processTranscriptFile({
    inputPath,
    knowledgePath: join(root, "data/knowledge_entries.json"),
    resumePath: join(root, "data/resume.json"),
    format,
    skipDedup: args.includes("--skip-dedup"),
    isDuplicate: checkDuplicate,
    generate: async ({ question, answer }) => {
      const { object } = await generateObject({
        model: openai("gpt-5.6-terra"),
        schema: z.object({ entries: z.array(GeneratedKnowledgeEntrySchema) }),
        system: STRUCTURING_PROMPT,
        prompt: `INTERVIEWER QUESTION:\n${question}\n\nDJ'S ANSWER:\n${answer}`,
        temperature: 0.2,
      });
      return object.entries;
    },
  });
  console.log(`Captured ${entries.length} new knowledge entries.`);
}

if (process.argv[1]?.endsWith("scripts/structure.ts")) {
  main().catch((error) => {
    console.error("Structuring failed:", error);
    process.exitCode = 1;
  });
}
