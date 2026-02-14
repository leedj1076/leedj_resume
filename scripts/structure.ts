import { generateObject, embed } from "ai";
import { google } from "@ai-sdk/google";
import { getPineconeClient } from "../lib/pinecone";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { z } from "zod";

// --- Schema ---

const VALID_SECTIONS = [
  "experience",
  "skills",
  "project",
  "education",
  "leadership",
  "awards",
  "narrative",
  "stories",
  "summary",
] as const;

const VALID_FOCUS_TAGS = [
  "business_development",
  "ai_llms",
  "leadership_strategy",
  "full_stack",
] as const;

const KnowledgeEntrySchema = z.object({
  chunk_id: z
    .string()
    .regex(/^[a-z0-9-]+$/, "chunk_id must be lowercase alphanumeric with hyphens"),
  question: z.string().min(10),
  answer_summary: z.string().min(20).max(300),
  text: z.string().min(50),
  source_type: z.literal("qa_story"),
  section: z.enum(VALID_SECTIONS),
  company: z.string().nullable(),
  role: z.string().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  depth: z.enum(["surface", "deep_dive"]),
  focus_tags: z.array(z.enum(VALID_FOCUS_TAGS)),
  is_core_strength: z.boolean(),
});

type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema> & {
  token_count: number;
};

interface ExistingEntry {
  chunk_id: string;
  text: string;
  [key: string]: unknown;
}

// --- Helpers ---

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English, ~2 for Korean
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(otherChars / 4 + koreanChars / 2);
}

function parseTranscript(raw: string): { question: string; answer: string }[] {
  const exchanges: { question: string; answer: string }[] = [];

  // Try Claude App format: "Human:" / "Assistant:" blocks
  const claudePattern = /(?:Human|User|H):\s*([\s\S]*?)(?=(?:Assistant|AI|A):\s*)((?:Assistant|AI|A):\s*[\s\S]*?)(?=(?:Human|User|H):\s*|$)/gi;
  let match;
  while ((match = claudePattern.exec(raw)) !== null) {
    const question = match[1].trim();
    const answer = match[2].replace(/^(?:Assistant|AI|A):\s*/i, "").trim();
    if (question.length > 10 && answer.length > 30) {
      exchanges.push({ question, answer });
    }
  }

  if (exchanges.length > 0) return exchanges;

  // Try Q/A format: lines starting with "Q:" and "A:"
  const qaPattern = /Q:\s*([\s\S]*?)(?=A:\s*)(A:\s*[\s\S]*?)(?=Q:\s*|$)/gi;
  while ((match = qaPattern.exec(raw)) !== null) {
    const question = match[1].trim();
    const answer = match[2].replace(/^A:\s*/i, "").trim();
    if (question.length > 10 && answer.length > 30) {
      exchanges.push({ question, answer });
    }
  }

  if (exchanges.length > 0) return exchanges;

  // Fallback: treat entire text as a single block to be structured
  console.log("  Could not parse transcript into Q&A exchanges.");
  console.log("  Treating the entire input as a single block for the LLM to structure.");
  exchanges.push({
    question: "(full transcript — LLM will extract questions)",
    answer: raw,
  });

  return exchanges;
}

const STRUCTURING_PROMPT = `You are a knowledge structuring agent. Given a raw interview exchange between
an interviewer and DJ (Dong Jae Lee), extract a structured knowledge entry.

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
- "section" must match the existing sections: experience, skills, project, education, leadership, awards, narrative, stories, summary.
- "chunk_id" must be a unique lowercase slug with hyphens (e.g., "story-flint-pivot-decision").
- "depth" should be "deep_dive" for detailed stories with specifics, "surface" for overview-level facts.
- For company/role/dates: infer from context. If not clear, set to null.
- If the exchange is too vague or uninformative to create a quality entry, return an empty array.`;

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const inputFlag = args.indexOf("--input");
  if (inputFlag === -1 || !args[inputFlag + 1]) {
    console.error("Usage: npm run structure -- --input <path-to-transcript.txt>");
    console.error("       npm run structure -- --input <path-to-transcript.txt> --skip-dedup");
    process.exit(1);
  }

  const inputPath = args[inputFlag + 1];
  const skipDedup = args.includes("--skip-dedup");

  if (!existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const rawTranscript = readFileSync(inputPath, "utf-8");
  console.log(`Read transcript: ${rawTranscript.length} chars`);

  // 1. Parse transcript into Q&A exchanges
  const exchanges = parseTranscript(rawTranscript);
  console.log(`Parsed ${exchanges.length} Q&A exchange(s)\n`);

  // 2. Load existing entries for dedup
  const knowledgePath = join(__dirname, "../data/knowledge_entries.json");
  const resumePath = join(__dirname, "../data/resume.json");
  const existingEntries: ExistingEntry[] = [];

  if (existsSync(resumePath)) {
    existingEntries.push(...JSON.parse(readFileSync(resumePath, "utf-8")));
  }
  if (existsSync(knowledgePath)) {
    existingEntries.push(...JSON.parse(readFileSync(knowledgePath, "utf-8")));
  }
  const existingIds = new Set(existingEntries.map((e) => e.chunk_id));
  console.log(`Existing entries: ${existingEntries.length} (${existingIds.size} unique IDs)\n`);

  // 3. Process each exchange through the LLM
  const allNewEntries: KnowledgeEntry[] = [];
  const skippedDuplicates: string[] = [];
  const failures: { index: number; error: string }[] = [];

  for (let i = 0; i < exchanges.length; i++) {
    const { question, answer } = exchanges[i];
    console.log(`--- Exchange ${i + 1}/${exchanges.length} ---`);
    console.log(`  Q: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);

    try {
      const { object: entries } = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: z.object({ entries: z.array(KnowledgeEntrySchema) }),
        system: STRUCTURING_PROMPT,
        prompt: `INTERVIEWER QUESTION:\n${question}\n\nDJ'S ANSWER:\n${answer}`,
        temperature: 0.2,
      });

      for (const entry of entries.entries) {
        // Ensure unique chunk_id
        let chunkId = entry.chunk_id;
        let suffix = 2;
        while (existingIds.has(chunkId) || allNewEntries.some((e) => e.chunk_id === chunkId)) {
          chunkId = `${entry.chunk_id}-${suffix}`;
          suffix++;
        }

        const entryWithTokens: KnowledgeEntry = {
          ...entry,
          chunk_id: chunkId,
          token_count: estimateTokens(entry.text),
        };

        // Deduplication check via embedding similarity
        if (!skipDedup && existingEntries.length > 0) {
          const isDuplicate = await checkDuplicate(entry.text, existingEntries);
          if (isDuplicate) {
            skippedDuplicates.push(`${chunkId}: "${entry.answer_summary.slice(0, 60)}..."`);
            console.log(`  SKIP (duplicate): ${chunkId}`);
            continue;
          }
        }

        allNewEntries.push(entryWithTokens);
        existingIds.add(chunkId);
        console.log(`  NEW: ${chunkId} (${entryWithTokens.token_count} tokens)`);
      }

      if (entries.entries.length === 0) {
        console.log("  SKIP: LLM returned no entries (exchange too vague)");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      failures.push({ index: i, error: msg });
      console.log(`  FAIL: ${msg.slice(0, 100)}`);
    }

    console.log();
  }

  // 4. Append new entries to knowledge_entries.json
  if (allNewEntries.length > 0) {
    let existing: KnowledgeEntry[] = [];
    if (existsSync(knowledgePath)) {
      existing = JSON.parse(readFileSync(knowledgePath, "utf-8"));
    }
    const merged = [...existing, ...allNewEntries];
    writeFileSync(knowledgePath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`Wrote ${allNewEntries.length} new entries to data/knowledge_entries.json`);
    console.log(`Total entries in file: ${merged.length}`);
  } else {
    console.log("No new entries to write.");
  }

  // 5. Session report
  console.log("\n" + "=".repeat(60));
  console.log("SESSION REPORT");
  console.log("=".repeat(60));
  console.log(`Exchanges processed: ${exchanges.length}`);
  console.log(`New entries captured: ${allNewEntries.length}`);
  console.log(`Duplicates skipped: ${skippedDuplicates.length}`);
  console.log(`Failures: ${failures.length}`);

  if (allNewEntries.length > 0) {
    const sections = new Map<string, number>();
    const focusTags = new Map<string, number>();
    for (const e of allNewEntries) {
      sections.set(e.section, (sections.get(e.section) || 0) + 1);
      for (const tag of e.focus_tags) {
        focusTags.set(tag, (focusTags.get(tag) || 0) + 1);
      }
    }

    console.log("\nTopics covered:");
    for (const [section, count] of sections) {
      console.log(`  ${section}: ${count} entries`);
    }

    console.log("\nFocus areas:");
    for (const [tag, count] of focusTags) {
      console.log(`  ${tag}: ${count} entries`);
    }

    console.log("\nNew entries:");
    for (const e of allNewEntries) {
      console.log(`  ${e.chunk_id}: "${e.question.slice(0, 60)}${e.question.length > 60 ? "..." : ""}"`);
    }
  }

  if (skippedDuplicates.length > 0) {
    console.log("\nDuplicates flagged:");
    for (const d of skippedDuplicates) {
      console.log(`  ${d}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  Exchange ${f.index + 1}: ${f.error.slice(0, 100)}`);
    }
    process.exit(1);
  }
}

async function checkDuplicate(
  newText: string,
  existingEntries: ExistingEntry[]
): Promise<boolean> {
  // Embed new text
  const { embedding: newEmb } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: newText,
    providerOptions: { google: { taskType: "RETRIEVAL_DOCUMENT" } },
  });

  // Check against Pinecone for similarity
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) return false;

  try {
    const pc = getPineconeClient();
    const index = pc.index(indexName);
    const ns = index.namespace("resume");

    const results = await ns.query({
      vector: newEmb,
      topK: 1,
      includeMetadata: false,
    });

    if (results.matches.length > 0 && (results.matches[0].score ?? 0) > 0.9) {
      return true;
    }
  } catch {
    // If Pinecone is unavailable, skip dedup
  }

  return false;
}

main().catch((err) => {
  console.error("Structuring failed:", err);
  process.exit(1);
});
