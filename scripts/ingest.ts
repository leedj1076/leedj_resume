import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { getPineconeClient } from "../lib/pinecone";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ResumeEntry {
  chunk_id: string;
  text: string;
  source_type: string;
  section: string;
  company: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  skills: string[];
  keywords: string[];
  token_count: number;
  depth?: string;
  focus_tags?: string[];
  is_core_strength?: boolean;
}

interface QAEntry extends ResumeEntry {
  question: string;
  answer_summary: string;
}

type AnyEntry = ResumeEntry | QAEntry;

function isQAEntry(entry: AnyEntry): entry is QAEntry {
  return "question" in entry && typeof entry.question === "string";
}

function buildEnrichedText(entry: AnyEntry): string {
  const parts: string[] = [];

  if (entry.role) parts.push(entry.role);
  if (entry.company) parts.push(`at ${entry.company}`);
  if (entry.start_date || entry.end_date) {
    const dates = [entry.start_date, entry.end_date].filter(Boolean).join(" – ");
    parts.push(`(${dates})`);
  }

  const prefix = parts.length > 0 ? `${parts.join(" ")}. ` : "";

  // For Q&A entries, prepend the question for better retrieval matching
  const questionPrefix = isQAEntry(entry) && entry.question
    ? `Q: ${entry.question}. `
    : "";

  return `${prefix}${questionPrefix}${entry.text}`;
}

// Convert "YYYY-MM" to numeric YYYYMM for Pinecone filter comparisons
function dateToNum(date: string): number {
  return parseInt(date.replace("-", ""), 10);
}

function printCoverageReport(
  resumeEntries: ResumeEntry[],
  qaEntries: QAEntry[]
) {
  console.log("\n" + "=".repeat(60));
  console.log("COVERAGE GAP REPORT");
  console.log("=".repeat(60));
  console.log(
    `Indexed ${resumeEntries.length} resume chunks + ${qaEntries.length} Q&A entries = ${resumeEntries.length + qaEntries.length} vectors total.\n`
  );

  // Coverage by section
  const sectionMap = new Map<string, { resume: number; qa: number }>();
  for (const e of resumeEntries) {
    const cur = sectionMap.get(e.section) || { resume: 0, qa: 0 };
    cur.resume++;
    sectionMap.set(e.section, cur);
  }
  for (const e of qaEntries) {
    const cur = sectionMap.get(e.section) || { resume: 0, qa: 0 };
    cur.qa++;
    sectionMap.set(e.section, cur);
  }

  const sectionTargets: Record<string, number> = {
    stories: 5,
    leadership: 3,
    education: 3,
    skills: 3,
  };

  console.log("Coverage by section:");
  for (const [section, counts] of sectionMap) {
    const total = counts.resume + counts.qa;
    const target = sectionTargets[section];
    const warning =
      target && counts.qa < target
        ? `  ⚠️  Recommend ${target}+ Q&A entries`
        : "";
    console.log(
      `  ${section}: ${total} entries (${counts.resume} resume + ${counts.qa} qa)${warning}`
    );
  }

  // Check for sections with zero entries
  for (const [section, target] of Object.entries(sectionTargets)) {
    if (!sectionMap.has(section)) {
      console.log(
        `  ${section}: 0 entries  ⚠️  Recommend ${target}+ Q&A entries`
      );
    }
  }

  // Coverage by focus
  const focusMap = new Map<string, number>();
  for (const e of [...resumeEntries, ...qaEntries]) {
    for (const tag of e.focus_tags ?? []) {
      focusMap.set(tag, (focusMap.get(tag) || 0) + 1);
    }
  }

  console.log("\nCoverage by focus:");
  for (const [tag, count] of focusMap) {
    console.log(`  ${tag}: ${count} entries`);
  }

  // Core strengths
  const coreCount = [...resumeEntries, ...qaEntries].filter(
    (e) => e.is_core_strength
  ).length;
  console.log(`\nCore strengths: ${coreCount} entries marked is_core_strength`);
}

async function main() {
  const indexName = process.env.PINECONE_INDEX_NAME!;
  const NAMESPACE = "resume";
  const DIMENSION = 3072;

  // 1. Read resume data
  const resumePath = join(__dirname, "../data/resume.json");
  const resumeRaw = readFileSync(resumePath, "utf-8");
  const resumeEntries: ResumeEntry[] = JSON.parse(resumeRaw);
  console.log(`Loaded ${resumeEntries.length} resume entries`);

  // 2. Read Q&A entries if they exist
  const qaPath = join(__dirname, "../data/knowledge_entries.json");
  let qaEntries: QAEntry[] = [];
  if (existsSync(qaPath)) {
    const qaRaw = readFileSync(qaPath, "utf-8");
    qaEntries = JSON.parse(qaRaw);
    console.log(`Loaded ${qaEntries.length} Q&A entries`);
  } else {
    console.log("No knowledge_entries.json found — indexing resume only");
  }

  // 3. Combine all entries
  const allEntries: AnyEntry[] = [...resumeEntries, ...qaEntries];
  console.log(`Total entries to index: ${allEntries.length}`);

  // 4. Build enriched text with contextual injection
  const enrichedTexts = allEntries.map(buildEnrichedText);

  // 5. Generate embeddings
  console.log("Generating embeddings with gemini-embedding-001...");
  const { embeddings } = await embedMany({
    model: google.embedding("gemini-embedding-001"),
    values: enrichedTexts,
    providerOptions: { google: { taskType: "RETRIEVAL_DOCUMENT" } },
  });
  console.log(
    `Generated ${embeddings.length} embeddings (dim=${embeddings[0].length})`
  );

  // 6. Create Pinecone index if it doesn't exist
  const pc = getPineconeClient();
  const existingIndexes = await pc.listIndexes();
  const indexExists = existingIndexes.indexes?.some(
    (i) => i.name === indexName
  );

  if (!indexExists) {
    console.log(`Creating index "${indexName}"...`);
    await pc.createIndex({
      name: indexName,
      dimension: DIMENSION,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
      waitUntilReady: true,
    });
    console.log("Index created and ready");
  } else {
    console.log(`Index "${indexName}" already exists`);
  }

  // 7. Delete all existing vectors in namespace
  const index = pc.index(indexName);
  console.log(`Deleting all existing vectors in namespace "${NAMESPACE}"...`);
  await index.namespace(NAMESPACE).deleteAll();

  // 8. Upsert vectors with metadata
  const vectors = allEntries.map((entry, i) => {
    const baseMetadata = {
      section: entry.section,
      company: entry.company ?? "",
      role: entry.role ?? "",
      start_date: entry.start_date ? dateToNum(entry.start_date) : 0,
      end_date: entry.end_date ? dateToNum(entry.end_date) : 0,
      skills: entry.skills,
      keywords: entry.keywords,
      depth: entry.depth ?? "surface",
      focus_tags: entry.focus_tags ?? [],
      is_core_strength: entry.is_core_strength ?? false,
      enrichedText: enrichedTexts[i],
    };

    // Add Q&A-specific metadata
    if (isQAEntry(entry)) {
      return {
        id: entry.chunk_id,
        values: embeddings[i],
        metadata: {
          ...baseMetadata,
          chunk_type: "qa_story",
          question: entry.question ?? "",
          answer_summary: entry.answer_summary ?? "",
        },
      };
    }

    return {
      id: entry.chunk_id,
      values: embeddings[i],
      metadata: baseMetadata,
    };
  });

  // Upsert in batches of 100 (Pinecone best practice)
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await index.namespace(NAMESPACE).upsert({ records: batch });
    console.log(
      `Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)} (${batch.length} vectors)`
    );
  }

  console.log(
    `\nUpserted ${vectors.length} vectors to namespace "${NAMESPACE}"`
  );
  console.log("Ingestion complete!");

  // 9. Coverage gap report
  printCoverageReport(resumeEntries, qaEntries);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
