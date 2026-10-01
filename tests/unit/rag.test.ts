import { describe, expect, it } from "vitest";
import { detectFilter, getCompanyOverviewId } from "@/lib/entity-detection";
import { normalizeChunk } from "@/lib/rag/metadata";
import { parseRewrite, buildRetrievalPlan } from "@/lib/rag/retrieval-plan";
import { selectEvidence } from "@/lib/rag/selection";
import { assembleContext } from "@/lib/rag/context";
import { buildSystemPrompt } from "@/lib/rag/prompts";
import { getSourceTags } from "@/lib/rag/labels";
import type { ChunkRecord } from "@/lib/rag/types";

const visitor = { persona: "curious_visitor", focus: "full_stack" } as const;
const chunk = (id: string, overrides: Partial<ChunkRecord> = {}): ChunkRecord => ({
  id, enrichedText: `Text for ${id}`, depth: "surface", section: "experience", skills: [],
  isCoreStrength: false, pineconeScore: 0.8, ...overrides,
});

describe("RAG provider boundary", () => {
  it("rejects malformed metadata and scores while keeping valid records", () => {
    expect(normalizeChunk("x", { enrichedText: 42 }, 0.8)).toBeNull();
    expect(normalizeChunk("x", { enrichedText: "text", skills: "RAG" }, 0.8)).toBeNull();
    expect(normalizeChunk("x", { enrichedText: "text" }, Number.NaN)).toBeNull();
    expect(normalizeChunk("x", { enrichedText: "text", skills: ["RAG"], is_core_strength: true, question: "Why?" }, 0.7))
      .toMatchObject({ id: "x", enrichedText: "text", depth: "surface", section: "", skills: ["RAG"], isCoreStrength: true, pineconeScore: 0.7, question: "Why?" });
  });

  it("falls back for invalid rewrite fields and accepts a legacy plain query", () => {
    expect(parseRewrite('{"query":42}', "original question")).toEqual({ query: "original question", intent: "specific", clarifications: [] });
    expect(parseRewrite('{"query":"new query","intent":"ambiguous","clarifications":["A?",42,"B?","C?","D?"]}', "original"))
      .toEqual({ query: "new query", intent: "ambiguous", clarifications: ["A?", "B?", "C?"] });
    expect(parseRewrite("legacy words", "original")).toEqual({ query: "legacy words", intent: "specific", clarifications: [] });
  });
});

describe("retrieval planning", () => {
  it.each([
    ["Flint", "company", 5, 20, "Flint Technologies", "exp-flint-overview"],
    ["in 2020", "temporal", 5, 15, undefined, undefined],
    ["education", "section", 5, 15, "education", undefined],
    ["career", "general", 10, null, undefined, undefined],
  ] as const)("plans %s branch", (query, kind, semanticTopK, filteredTopK, value, companyPin) => {
    const plan = buildRetrievalPlan({ query, visitor, intent: "specific" });
    expect(plan.kind).toBe(kind);
    expect(plan.semanticTopK).toBe(semanticTopK);
    expect(plan.filteredTopK).toBe(filteredTopK);
    expect(plan.pinnedIds).toEqual(["narrative-career-trajectory", "personal-summary", ...(companyPin ? [companyPin] : [])]);
    expect(plan.filterValue).toBe(value);
    expect(plan.focusFilter).toBeNull();
    expect(plan.rawQaTopK).toBe(5);
  });

  it("includes focus query and skips raw QA for broad intent", () => {
    const plan = buildRetrievalPlan({ query: "career", visitor: { persona: "recruiter", focus: "ai_llms" }, intent: "broad" });
    expect(plan.focusTopK).toBe(8);
    expect(plan.focusFilter).toMatchObject({ skills: { $in: expect.arrayContaining(["RAG"]) } });
    expect(plan.rawQaTopK).toBeNull();
  });

  it("selects exact year boundaries, ended overlaps, and known-start ongoing experience", () => {
    const filter = detectFilter("during 2020");
    expect(filter?.type).toBe("temporal");
    if (!filter || filter.type !== "temporal") return;
    const match = (record: Record<string, unknown>) => {
      const evalFilter = (f: Record<string, unknown>): boolean => {
        if ("$and" in f) return (f.$and as Record<string, unknown>[]).every(evalFilter);
        if ("$or" in f) return (f.$or as Record<string, unknown>[]).some(evalFilter);
        return Object.entries(f).every(([field, operators]) => Object.entries(operators as Record<string, unknown>).every(([operator, value]) => {
          const actual = record[field];
          if (operator === "$eq") return actual === value;
          if (operator === "$lte") return typeof actual === "number" && actual <= (value as number);
          if (operator === "$gte") return typeof actual === "number" && actual >= (value as number);
          if (operator === "$gt") return typeof actual === "number" && actual > (value as number);
          return false;
        }));
      };
      return evalFilter(filter.filter);
    };
    expect(match({ section: "experience", start_date: 202012, end_date: 202101 })).toBe(true);
    expect(match({ section: "experience", start_date: 201901, end_date: 202001 })).toBe(true);
    expect(match({ section: "experience", start_date: 201901, end_date: 0, is_ongoing: true })).toBe(true);
    expect(match({ section: "experience", start_date: 201901, end_date: 0 })).toBe(true);
    expect(match({ section: "experience", start_date: 202101, end_date: 0, is_ongoing: true })).toBe(false);
    expect(match({ section: "experience", start_date: 0, end_date: 0 })).toBe(false);
    expect(match({ section: "summary", start_date: 201901, end_date: 0 })).toBe(false);
    expect(match({ section: "experience", start_date: 201901, end_date: 201912 })).toBe(false);
  });

  it("retains company and section detection exports", () => {
    expect(detectFilter("Flint education")).toEqual({ type: "company", value: "Flint Technologies" });
    expect(getCompanyOverviewId("Flint Technologies")).toBe("exp-flint-overview");
  });
});

describe("evidence selection and presentation", () => {
  it("preserves persona multiplication and insertion order on ties without semantic score multiplication", () => {
    const selected = selectEvidence([
      chunk("low-sim", { section: "experience", pineconeScore: 0.1 }),
      chunk("high-sim", { section: "experience", pineconeScore: 0.99 }),
      chunk("core", { section: "summary", isCoreStrength: true }),
    ], [], { persona: "recruiter", focus: "full_stack" }, "specific");
    expect(selected.rankedChunks.map(c => c.id)).toEqual(["core", "low-sim", "high-sim"]);
  });

  it("caps ranking at fifteen and keeps a direct primary outside that cap", () => {
    const candidates = Array.from({ length: 17 }, (_, index) => chunk(`candidate-${index}`));
    const raw = chunk("story-apple-partnership-negotiation", { chunkType: "qa_story", pineconeScore: 0.9, question: "Apple?" });
    const selected = selectEvidence(candidates, [raw], visitor, "specific");
    expect(selected.rankedChunks).toHaveLength(15);
    expect(selected.directMatchChunk?.id).toBe(raw.id);
    const context = assembleContext(selected);
    const expectedPromptIds = [raw.id, ...candidates.slice(0, 5).map(c => c.id)];
    expect(context.usedChunks.map(chunk => chunk.id)).toEqual(expectedPromptIds);
    expect(context.primaryChunkId).toBe(raw.id);
    expect(context.text).toContain("[PRIMARY ANSWER]");
    expect(context.text).not.toContain("Text for candidate-6");
    expect(getSourceTags(context.usedChunks)).toEqual(["Apple Partnership"]);
  });

  it("suppresses pinned and raw direct records before selection", () => {
    const forbidden = chunk("interview-q2.1-why-vc", { chunkType: "qa_story", pineconeScore: 0.98 });
    const selected = selectEvidence([forbidden, chunk("personal-summary"), chunk("safe")], [forbidden],
      { persona: "developer_partnerships", focus: "full_stack" }, "specific");
    expect(selected.directMatchChunk).toBeNull();
    expect(assembleContext(selected).usedChunks.map(c => c.id)).toEqual(["personal-summary", "safe"]);
  });

  it("uses dampened raw scores and direct gap thresholds", () => {
    const recruiter = { persona: "recruiter", focus: "full_stack" } as const;
    const vc = chunk("interview-q2.1-why-vc", { chunkType: "qa_story", pineconeScore: 0.9 });
    expect(selectEvidence([], [vc], recruiter, "specific").directMatchChunk).toBeNull();
    const a = chunk("a", { chunkType: "qa_story", pineconeScore: 0.75 });
    const b = chunk("b", { chunkType: "qa_story", pineconeScore: 0.73 });
    expect(selectEvidence([], [a, b], visitor, "specific").directMatchChunk).toBeNull();
    expect(selectEvidence([], [a, chunk("b", { chunkType: "qa_story", pineconeScore: 0.72 })], visitor, "specific").directMatchChunk?.id).toBe("a");
    expect(selectEvidence([], [chunk("a", { chunkType: "qa_story", pineconeScore: 0.85 }), chunk("b", { chunkType: "qa_story", pineconeScore: 0.84 })], visitor, "specific").directMatchChunk?.id).toBe("a");
    expect(selectEvidence([], [a], visitor, "broad").directMatchChunk).toBeNull();
  });

  it("groups standard context and caps deduplicated labels at three", () => {
    const selected = selectEvidence([
      chunk("personal-summary"), chunk("exp-dug-overview"), chunk("exp-flint-overview", { depth: "deep_dive" }),
      chunk("exp-tmax-team-lead"), chunk("edu-kaist-masters"),
    ], [], visitor, "specific");
    const context = assembleContext(selected);
    expect(context.primaryChunkId).toBeNull();
    expect(context.text).toContain("--- DETAILED STORIES (for follow-up depth) ---");
    expect(context.usedChunks.map(c => c.id)).toEqual(["personal-summary", "exp-dug-overview", "exp-tmax-team-lead", "edu-kaist-masters", "exp-flint-overview"]);
    expect(getSourceTags(context.usedChunks)).toEqual(["Devs United Games", "Tmax Team Lead", "KAIST M.S."]);
  });

  it("preserves the direct and overview prompt instructions", () => {
    const direct = buildSystemPrompt({ context: "evidence", visitor, intent: "specific", primaryChunkId: "answer", modePrompt: "Be concise.", coveredTopics: ["Apple"] });
    expect(direct).toContain("DIRECT MATCH MODE:");
    expect(direct).toContain("Use the PRIMARY ANSWER as the backbone");
    expect(direct).toContain("TOPICS ALREADY DISCUSSED IN THIS SESSION: Apple");
    expect(direct).toContain("--- MY RESUME ---\nevidence");
    const broad = buildSystemPrompt({ context: "evidence", visitor, intent: "broad", primaryChunkId: null, modePrompt: "Be concise.", coveredTopics: [] });
    expect(broad).toContain("RESPONSE MODE: OVERVIEW");
    expect(broad).toContain("suggest exactly 2 brief follow-up questions");
  });
});
