import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { structureKnowledge } from "@/lib/server/knowledge-structuring";
import { processTranscriptFile } from "@/scripts/structure";

const dirs: string[] = [];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "resume-structure-"));
  dirs.push(dir);
  const inputPath = join(dir, "capture.txt");
  const knowledgePath = join(dir, "knowledge.json");
  const resumePath = join(dir, "resume.json");
  writeFileSync(
    inputPath,
    "Transcript v1\n\nInterviewer:\nWhat did you build?\n\nSubject:\nI built the retrieval system.",
  );
  writeFileSync(knowledgePath, "[]\n");
  writeFileSync(resumePath, "[]\n");
  return { dir, inputPath, knowledgePath, resumePath };
}
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const generated = {
  chunk_id: "story-retrieval-system",
  question: "What retrieval system did Dong Jae Lee build?",
  answer_summary:
    "Dong Jae Lee built a retrieval system with better search quality.",
  text: "Dong Jae Lee built a retrieval system for candidate questions and improved its search quality through careful evaluation.",
  source_type: "qa_story",
  section: "stories",
  company: null,
  role: null,
  start_date: null,
  end_date: null,
  skills: ["search"],
  keywords: ["retrieval"],
  depth: "deep_dive",
  focus_tags: ["ai_llms"],
  is_core_strength: false,
};

describe("knowledge structuring", () => {
  it("starts the CLI and reports usage before loading provider configuration", () => {
    const result = spawnSync(
      join(process.cwd(), "node_modules/.bin/tsx"),
      ["scripts/structure.ts"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage: npm run structure");
  });

  it("rejects malformed generated records", async () => {
    await expect(
      structureKnowledge(
        [{ question: "What did you build?", answer: "A retrieval system" }],
        async () => [{ ...generated, section: "invalid" }],
      ),
    ).rejects.toThrow();
  });

  it("writes valid entries after all exchanges are generated", async () => {
    const paths = fixture();
    const entries = await processTranscriptFile({
      ...paths,
      format: "auto",
      generate: async () => [generated],
    });
    expect(entries).toHaveLength(1);
    expect(
      JSON.parse(readFileSync(paths.knowledgePath, "utf8"))[0],
    ).toMatchObject({
      chunk_id: "story-retrieval-system",
      token_count: expect.any(Number),
    });
    expect(
      readdirSync(paths.dir).filter((name) => name.includes(".tmp")),
    ).toEqual([]);
  });

  it("keeps the original file when transcript parsing fails", async () => {
    const paths = fixture();
    writeFileSync(paths.inputPath, "Human: question\nAssistant: answer");
    await expect(
      processTranscriptFile({
        ...paths,
        format: "auto",
        generate: async () => [generated],
      }),
    ).rejects.toThrow(/--format capture-legacy/);
    expect(readFileSync(paths.knowledgePath, "utf8")).toBe("[]\n");
  });

  it("keeps the original file if any provider call fails", async () => {
    const paths = fixture();
    writeFileSync(
      paths.inputPath,
      "Q: First question?\nA: First answer.\nQ: Second question?\nA: Second answer.",
    );
    let count = 0;
    await expect(
      processTranscriptFile({
        ...paths,
        format: "qa",
        generate: async () => {
          if (++count === 2) throw new Error("provider unavailable");
          return [generated];
        },
      }),
    ).rejects.toThrow("provider unavailable");
    expect(readFileSync(paths.knowledgePath, "utf8")).toBe("[]\n");
  });

  it("rejects generated IDs already in resume or another generated entry", async () => {
    const paths = fixture();
    writeFileSync(
      paths.resumePath,
      JSON.stringify([{ ...generated, token_count: 28 }]),
    );
    await expect(
      processTranscriptFile({
        ...paths,
        format: "auto",
        generate: async () => [generated],
      }),
    ).rejects.toThrow(/duplicate/i);
    expect(readFileSync(paths.knowledgePath, "utf8")).toBe("[]\n");
    writeFileSync(paths.resumePath, "[]\n");
    await expect(
      processTranscriptFile({
        ...paths,
        format: "auto",
        generate: async () => [generated, generated],
      }),
    ).rejects.toThrow(/duplicate/i);
    expect(readFileSync(paths.knowledgePath, "utf8")).toBe("[]\n");
  });

  it("keeps the original file and removes temp file when rename fails", async () => {
    const paths = fixture();
    await expect(
      processTranscriptFile({
        ...paths,
        format: "auto",
        generate: async () => [generated],
        rename: () => {
          throw new Error("rename failed");
        },
      }),
    ).rejects.toThrow("rename failed");
    expect(readFileSync(paths.knowledgePath, "utf8")).toBe("[]\n");
    expect(
      readdirSync(paths.dir).filter((name) => name.includes(".tmp")),
    ).toEqual([]);
  });
});
