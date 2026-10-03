import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("loads evaluator vector providers in plain Node/tsx without Vitest aliases or network", () => {
  const result = execFileSync(
    process.execPath,
    [
      "--require",
      "tsx/cjs",
      "-e",
      `
    global.fetch = () => { throw new Error("Network forbidden"); };
    const { getResumeIndex } = require("./lib/pinecone.ts");
    const providers = require("./lib/server/providers.ts");
    delete process.env.PINECONE_INDEX_NAME;
    try { getResumeIndex(); } catch (e) {
      if (e.message !== "PINECONE_INDEX_NAME is not configured") throw e;
    }
    if (typeof providers.searchChunks !== "function" || typeof providers.fetchChunks !== "function") throw new Error("Missing adapters");
    console.log("CLI providers imported without network");
  `,
    ],
    { encoding: "utf8" },
  );
  expect(result).toContain("CLI providers imported without network");
});
