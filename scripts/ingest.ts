import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { getPineconeClient } from "../lib/pinecone";
import { readFileSync } from "fs";
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
}

function buildEnrichedText(entry: ResumeEntry): string {
  const parts: string[] = [];

  if (entry.role) parts.push(entry.role);
  if (entry.company) parts.push(`at ${entry.company}`);
  if (entry.start_date || entry.end_date) {
    const dates = [entry.start_date, entry.end_date].filter(Boolean).join(" – ");
    parts.push(`(${dates})`);
  }

  const prefix = parts.length > 0 ? `${parts.join(" ")}. ` : "";
  return `${prefix}${entry.text}`;
}

async function main() {
  const indexName = process.env.PINECONE_INDEX_NAME!;
  const NAMESPACE = "resume";
  const DIMENSION = 3072;

  // 1. Read resume data
  const raw = readFileSync(join(__dirname, "../data/resume.json"), "utf-8");
  const entries: ResumeEntry[] = JSON.parse(raw);
  console.log(`Loaded ${entries.length} resume entries`);

  // 2. Build enriched text with contextual injection
  const enrichedTexts = entries.map(buildEnrichedText);

  // 3. Generate embeddings
  console.log("Generating embeddings with gemini-embedding-001...");
  const { embeddings } = await embedMany({
    model: google.embedding("gemini-embedding-001"),
    values: enrichedTexts,
    providerOptions: { google: { taskType: "RETRIEVAL_DOCUMENT" } },
  });
  console.log(`Generated ${embeddings.length} embeddings (dim=${embeddings[0].length})`);

  // 4. Create Pinecone index if it doesn't exist
  const pc = getPineconeClient();
  const existingIndexes = await pc.listIndexes();
  const indexExists = existingIndexes.indexes?.some((i) => i.name === indexName);

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

  // 5. Delete all existing vectors in namespace
  const index = pc.index(indexName);
  console.log(`Deleting all existing vectors in namespace "${NAMESPACE}"...`);
  await index.namespace(NAMESPACE).deleteAll();

  // 6. Upsert vectors with metadata
  const vectors = entries.map((entry, i) => ({
    id: entry.chunk_id,
    values: embeddings[i],
    metadata: {
      section: entry.section,
      company: entry.company ?? "",
      role: entry.role ?? "",
      start_date: entry.start_date ?? "",
      end_date: entry.end_date ?? "",
      skills: entry.skills,
      keywords: entry.keywords,
      depth: entry.depth ?? "surface",
      enrichedText: enrichedTexts[i],
    },
  }));

  await index.namespace(NAMESPACE).upsert({ records: vectors });
  console.log(`Upserted ${vectors.length} vectors to namespace "${NAMESPACE}"`);
  console.log("Ingestion complete!");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
