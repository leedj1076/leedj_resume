import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { getPineconeClient } from "../lib/pinecone";
import { detectFilter, getCompanyOverviewId } from "../lib/entity-detection";

// Test cases: query → expected chunk IDs that should appear in results
const TEST_CASES: { query: string; expectedIds: string[]; description: string }[] = [
  {
    query: "What did you do at Devs United Games?",
    expectedIds: [
      "exp-dug-overview",
      "exp-dug-partnerships",
      "exp-dug-revenue",
      "exp-dug-apple-spatial",
      "exp-dug-ai-ops",
    ],
    description: "Company query should retrieve all DUG surface chunks",
  },
  {
    query: "Tell me about your experience at Flint",
    expectedIds: [
      "exp-flint-overview",
      "exp-flint-product-gtm",
      "exp-flint-fundraising",
    ],
    description: "Company query should retrieve all Flint surface chunks",
  },
  {
    query: "What did you do at TmaxTibero?",
    expectedIds: [
      "exp-tmax-team-lead",
      "exp-tmax-enterprise-clients",
      "exp-tmax-software-engineer",
    ],
    description: "Company query should retrieve all Tmax surface chunks",
  },
  {
    query: "Tell me about your education",
    expectedIds: [
      "edu-kaist-masters",
      "edu-kit-dual-degree",
      "edu-kaist-bachelors",
    ],
    description: "Section filter should retrieve all education chunks",
  },
  {
    query: "What awards have you received?",
    expectedIds: ["honors-awards"],
    description: "Section filter should retrieve awards chunk",
  },
  {
    query: "Tell me about the Apple partnership",
    expectedIds: [
      "exp-dug-apple-spatial",
      "story-apple-partnership-negotiation",
    ],
    description: "Semantic search should find Apple-related chunks",
  },
  {
    query: "What AI tools have you used?",
    expectedIds: ["exp-dug-ai-ops"],
    description: "Cross-cutting query should find AI ops chunk via semantic search",
  },
  {
    query: "What were you doing in 2020?",
    expectedIds: ["exp-tmax-team-lead", "exp-tmax-enterprise-clients"],
    description: "Temporal query should find chunks overlapping 2020",
  },
  {
    query: "What is your most recent role?",
    expectedIds: ["exp-dug-overview"],
    description: "Recency query should resolve to DUG",
  },
  {
    query: "데브스에서 무엇을 하셨나요?",
    expectedIds: ["exp-dug-overview", "exp-dug-partnerships"],
    description: "Korean company query should detect DUG",
  },
  {
    query: "Tell me about your partnership negotiation experience",
    expectedIds: ["narrative-partnership-expertise", "exp-dug-partnerships"],
    description: "BD-focus query should retrieve partnership chunks",
  },
  {
    query: "What RAG and AI tools have you built?",
    expectedIds: ["exp-dug-ai-ops", "project-whiskey-rag"],
    description: "AI-focus query should retrieve AI/RAG chunks",
  },
];

const BASE_PINNED_IDS = ["narrative-career-trajectory", "personal-summary"];

async function runEval() {
  const indexName = process.env.PINECONE_INDEX_NAME!;
  const pc = getPineconeClient();
  const index = pc.index(indexName);
  const ns = index.namespace("resume");

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    const { query, expectedIds, description } = testCase;

    // 1. Detect filter
    const detected = detectFilter(query);

    // 2. Embed query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-large"),
      value: query,
    });

    // 3. Build pinned IDs
    const pinnedIds = [...BASE_PINNED_IDS];
    if (detected?.type === "company") {
      const overviewId = getCompanyOverviewId(detected.value);
      if (overviewId) pinnedIds.push(overviewId);
    }

    // 4. Retrieve chunks (same logic as route.ts)
    const retrievedIds = new Set<string>();

    if (detected?.type === "company") {
      const [semanticResults, companyResults, pinnedResults] = await Promise.all([
        ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
        ns.query({
          vector: embedding,
          topK: 20,
          includeMetadata: true,
          filter: { company: { $eq: detected.value } },
        }),
        ns.fetch({ ids: pinnedIds }),
      ]);
      for (const id of pinnedIds) {
        if (pinnedResults.records[id]) retrievedIds.add(id);
      }
      for (const m of companyResults.matches) retrievedIds.add(m.id);
      for (const m of semanticResults.matches) retrievedIds.add(m.id);
    } else if (detected?.type === "temporal") {
      const [semanticResults, temporalResults, pinnedResults] = await Promise.all([
        ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
        ns.query({
          vector: embedding,
          topK: 15,
          includeMetadata: true,
          filter: detected.filter,
        }),
        ns.fetch({ ids: pinnedIds }),
      ]);
      for (const id of pinnedIds) {
        if (pinnedResults.records[id]) retrievedIds.add(id);
      }
      for (const m of temporalResults.matches) retrievedIds.add(m.id);
      for (const m of semanticResults.matches) retrievedIds.add(m.id);
    } else if (detected?.type === "section") {
      const [semanticResults, sectionResults, pinnedResults] = await Promise.all([
        ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
        ns.query({
          vector: embedding,
          topK: 15,
          includeMetadata: true,
          filter: { section: { $eq: detected.value } },
        }),
        ns.fetch({ ids: pinnedIds }),
      ]);
      for (const id of pinnedIds) {
        if (pinnedResults.records[id]) retrievedIds.add(id);
      }
      for (const m of sectionResults.matches) retrievedIds.add(m.id);
      for (const m of semanticResults.matches) retrievedIds.add(m.id);
    } else {
      const [semanticResults, pinnedResults] = await Promise.all([
        ns.query({ vector: embedding, topK: 10, includeMetadata: true }),
        ns.fetch({ ids: pinnedIds }),
      ]);
      for (const id of pinnedIds) {
        if (pinnedResults.records[id]) retrievedIds.add(id);
      }
      for (const m of semanticResults.matches) retrievedIds.add(m.id);
    }

    // 5. Check recall
    const foundIds = expectedIds.filter((id) => retrievedIds.has(id));
    const missingIds = expectedIds.filter((id) => !retrievedIds.has(id));
    const recall = foundIds.length / expectedIds.length;
    const pass = recall === 1.0;

    if (pass) {
      passed++;
      console.log(`  PASS  ${description}`);
      console.log(`        Filter: ${detected ? JSON.stringify(detected) : "none"} | Retrieved: ${retrievedIds.size} chunks | Recall: ${(recall * 100).toFixed(0)}%`);
    } else {
      failed++;
      console.log(`  FAIL  ${description}`);
      console.log(`        Filter: ${detected ? JSON.stringify(detected) : "none"} | Retrieved: ${retrievedIds.size} chunks | Recall: ${(recall * 100).toFixed(0)}%`);
      console.log(`        Missing: ${missingIds.join(", ")}`);
      console.log(`        Got: ${[...retrievedIds].join(", ")}`);
    }
    console.log();
  }

  console.log("=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${TEST_CASES.length} tests`);
  console.log(`Overall recall: ${((passed / TEST_CASES.length) * 100).toFixed(0)}%`);

  if (failed > 0) process.exit(1);
}

runEval().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});
