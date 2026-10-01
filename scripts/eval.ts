import { existsSync } from "node:fs";
import { parseChatRequest } from "../lib/server/chat-request";
import { prepareAnswer } from "../lib/server/rag-service";

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
    expectedIds: ["changjo-2026-current-role"],
    description: "Recency query should resolve to Changjo",
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

const usage = `Usage: npm run eval -- [--help | --offline]

Without flags, evaluates expected IDs using the retrieval-only prepareAnswer path.
--offline lists the cases without contacting providers.
--help prints this message.`;

async function runEval(): Promise<void> {
  if (process.argv.includes("--help")) { console.log(usage); return; }
  if (process.argv.includes("--offline")) {
    console.log(`${TEST_CASES.length} retrieval cases ready (offline; no provider calls).`);
    return;
  }
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  let passed = 0;
  for (const testCase of TEST_CASES) {
    const request = parseChatRequest({ messages: [{ role: "user", content: testCase.query }],
      visitorData: { persona: "vc", focus: "full_stack" } });
    if (request.type !== "chat") throw new Error("Expected chat request");
    const prepared = await prepareAnswer(request, new AbortController().signal, { answerMode: "default" });
    const retrievedIds = new Set(prepared.context.usedChunks.map(chunk => chunk.id));
    const missing = testCase.expectedIds.filter(id => !retrievedIds.has(id));
    const pass = missing.length === 0;
    if (pass) passed++;
    console.log(`${pass ? "PASS" : "FAIL"} ${testCase.description}`);
    if (!pass) console.log(`  Missing: ${missing.join(", ")}`);
  }
  console.log(`Results: ${passed}/${TEST_CASES.length} passed`);
  if (passed !== TEST_CASES.length) process.exitCode = 1;
}

runEval().catch(error => {
  console.error("Eval failed:", error);
  process.exitCode = 1;
});
