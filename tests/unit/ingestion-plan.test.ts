import { describe, expect, it } from "vitest";
import resume from "@/data/resume.json";
import { buildEnrichedText, buildKnowledgeMetadata } from "@/lib/rag/knowledge-metadata";
import { planIngestion } from "@/lib/server/ingestion";
import type { KnowledgeEntry } from "@/lib/domain/knowledge";

const entry = resume[0] as KnowledgeEntry;

describe("knowledge metadata", () => {
  it("keeps contextual text and marks only dated, open-ended experience as ongoing", () => {
    const experience = { ...entry, chunk_id: "current-role", section: "experience" as const,
      role: "Engineer", company: "Acme", start_date: "2024-01", end_date: null };
    expect(buildEnrichedText(experience)).toContain("Engineer at Acme (2024-01). ");
    expect(buildKnowledgeMetadata(experience)).toMatchObject({
      source_owner: "ask-dj:json:v1", start_date: 202401, end_date: 0, is_ongoing: true,
      enrichedText: buildEnrichedText(experience),
    });
    expect(buildKnowledgeMetadata({ ...experience, section: "stories" }).is_ongoing).toBe(false);
    expect(buildKnowledgeMetadata({ ...experience, start_date: null }).is_ongoing).toBe(false);
    expect(buildKnowledgeMetadata({ ...experience, end_date: "2025-02" }).is_ongoing).toBe(false);
    expect(buildKnowledgeMetadata({ ...experience, end_date: undefined }).is_ongoing).toBe(false);
  });

  it("keeps question text and Q&A metadata for story retrieval", () => {
    const qa = { ...entry, source_type: "qa_story" as const, question: "Why?", answer_summary: "Because." };
    expect(buildEnrichedText(qa)).toContain("Q: Why?. ");
    expect(buildKnowledgeMetadata(qa)).toMatchObject({ chunk_type: "qa_story", question: "Why?", answer_summary: "Because." });
  });
});

describe("ingestion plan", () => {
  it("preserves corrections and untagged legacy vectors even when source is empty", () => {
    expect(planIngestion([], [{ id: "dj-correction-42" }, { id: "legacy-unknown" }])).toEqual({
      createIds: [], updateIds: [], deleteIds: [], preservedIds: ["dj-correction-42", "legacy-unknown"],
    });
  });

  it("updates stable source IDs and prunes only stale owned IDs", () => {
    expect(planIngestion([entry], [
      { id: entry.chunk_id, sourceOwner: "ask-dj:json:v1" },
      { id: "stale-owned", sourceOwner: "ask-dj:json:v1" },
      { id: "legacy-unknown" },
      { id: "dj-correction-42", sourceOwner: "ask-dj:json:v1" },
    ])).toEqual({
      createIds: [], updateIds: [entry.chunk_id], deleteIds: ["stale-owned"],
      preservedIds: ["legacy-unknown", "dj-correction-42"],
    });
  });

  it("rejects duplicate, malformed, and reserved source IDs", () => {
    expect(() => planIngestion([entry, entry], [])).toThrow(/duplicate/i);
    expect(() => planIngestion([{ ...entry, text: "" }], [])).toThrow();
    expect(() => planIngestion([{ ...entry, chunk_id: "dj-correction-42" }], [])).toThrow(/reserved/i);
  });
});
