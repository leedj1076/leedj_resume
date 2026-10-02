import { describe, expect, it } from "vitest";
import resume from "@/data/resume.json";
import knowledge from "@/data/knowledge_entries.json";
import { resolveVisitor } from "@/lib/domain/personas";
import { resolvePersonaOptions } from "@/lib/domain/personas";
import { toApiLanguage } from "@/lib/domain/language";
import { KnowledgeEntrySchema } from "@/lib/domain/knowledge";
import { getMessageText, parseFollowUps } from "@/lib/chat/messages";

describe("visitor resolution", () => {
  it("rejects inherited keys and safely defaults", () => {
    expect(
      resolveVisitor({ persona: "constructor", focus: "full_stack" }),
    ).toEqual({ persona: "vc", focus: "full_stack" });
    expect(
      resolveVisitor({ persona: "toString", focus: "full_stack" }),
    ).toEqual({ persona: "vc", focus: "full_stack" });
    expect(
      resolveVisitor({ persona: "__proto__", focus: "full_stack" }),
    ).toEqual({ persona: "vc", focus: "full_stack" });
  });

  it("preserves canonical and legacy persona and focus IDs", () => {
    const aliases = {
      founder: "founder_partner",
      partner: "founder_partner",
      strategy: "vc",
      bd: "founder_partner",
      hiring: "recruiter",
      vc_investor: "vc",
      corporate_strategy: "vc",
      bd_partnerships: "founder_partner",
      hiring_manager: "recruiter",
    } as const;
    for (const [alias, expected] of Object.entries(aliases)) {
      expect(resolveVisitor({ persona: alias, focus: "ai_llms" }).persona).toBe(
        expected,
      );
    }
    expect(
      resolveVisitor({ persona: "founder", focus: "ai_llms" }).persona,
    ).toBe("founder_partner");
    expect(
      resolveVisitor({ persona: "recruiter", focus: "fullstack" }),
    ).toEqual({ persona: "recruiter", focus: "full_stack" });
    expect(resolveVisitor({ persona: "vc", focus: "bd" })).toEqual({
      persona: "vc",
      focus: "business_development",
    });
    expect(resolveVisitor({ persona: "vc", focus: "ai" })).toEqual({
      persona: "vc",
      focus: "ai_llms",
    });
    expect(resolveVisitor({ persona: "vc", focus: "leadership" })).toEqual({
      persona: "vc",
      focus: "leadership_strategy",
    });
  });

  it("defaults malformed values without reading inherited properties", () => {
    expect(resolveVisitor(null)).toEqual({
      persona: "vc",
      focus: "full_stack",
    });
    expect(resolveVisitor([])).toEqual({ persona: "vc", focus: "full_stack" });
    expect(
      resolveVisitor(Object.create({ persona: "recruiter", focus: "ai_llms" })),
    ).toEqual({ persona: "vc", focus: "full_stack" });
  });
});

describe("persona display", () => {
  it("falls back to all options for empty visibility", () => {
    expect(resolvePersonaOptions([], null).map((o) => o.value)).toEqual([
      "recruiter",
      "developer_partnerships",
      "vc",
      "founder_partner",
      "curious_visitor",
    ]);
  });

  it("keeps display order and falls back for blank labels", () => {
    expect(
      resolvePersonaOptions(["vc", "recruiter", "vc", "toString"], {
        vc: { en: "  Investor  ", kr: "  " },
        recruiter: { en: "", kr: "채용팀" },
      }),
    ).toEqual([
      { value: "recruiter", en: "Recruiter (Product Owner)", kr: "채용팀" },
      { value: "vc", en: "Investor", kr: "VC" },
    ]);
  });
});

it("maps the UI Korean code to the API code", () => {
  expect(toApiLanguage("en")).toBe("en");
  expect(toApiLanguage("kr")).toBe("ko");
});

describe("knowledge corpus", () => {
  it("validates both current JSON files without changing or duplicating IDs", () => {
    const entries = [...resume, ...knowledge];
    const parsed = entries.map((entry) => KnowledgeEntrySchema.parse(entry));
    expect(parsed.map((entry) => entry.chunk_id)).toEqual(
      entries.map((entry) => entry.chunk_id),
    );
    expect(new Set(parsed.map((entry) => entry.chunk_id)).size).toBe(
      entries.length,
    );
    expect(entries.length).toBe(92);
  });

  it("rejects impossible calendar months", () => {
    expect(
      KnowledgeEntrySchema.safeParse({ ...resume[0], start_date: "2024-13" })
        .success,
    ).toBe(false);
    expect(
      KnowledgeEntrySchema.safeParse({ ...resume[0], end_date: "2024-00" })
        .success,
    ).toBe(false);
  });

  it("accepts the existing generated stories section", () => {
    expect(
      KnowledgeEntrySchema.parse({ ...knowledge[0], section: "stories" })
        .section,
    ).toBe("stories");
  });
});

describe("chat message helpers", () => {
  it("concatenates only text parts", () => {
    expect(
      getMessageText({
        id: "a",
        role: "assistant",
        parts: [
          { type: "text", text: "Hello" },
          { type: "step-start" },
          { type: "text", text: " world" },
        ],
      }),
    ).toBe("Hello world");
  });

  it("extracts only complete trailing follow-up tags", () => {
    expect(
      parseFollowUps(
        "Answer\n<followup>\nFirst?\nSecond?\nThird?\n</followup>  ",
      ),
    ).toEqual({
      clean: "Answer",
      followUps: ["First?", "Second?"],
    });
    expect(parseFollowUps("Answer <followup>Incomplete")).toEqual({
      clean: "Answer <followup>Incomplete",
      followUps: [],
    });
    expect(
      parseFollowUps("Answer <followup>One?</followup> trailing text"),
    ).toEqual({
      clean: "Answer <followup>One?</followup> trailing text",
      followUps: [],
    });
  });
});
