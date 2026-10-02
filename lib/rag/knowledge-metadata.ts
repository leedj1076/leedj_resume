import type { KnowledgeEntry } from "../domain/knowledge";

export const KNOWLEDGE_SOURCE_OWNER = "ask-dj:json:v1";

export function buildEnrichedText(entry: KnowledgeEntry): string {
  const context: string[] = [];
  if (entry.role) context.push(entry.role);
  if (entry.company) context.push(`at ${entry.company}`);
  if (entry.start_date || entry.end_date) {
    context.push(
      `(${[entry.start_date, entry.end_date].filter(Boolean).join(" – ")})`,
    );
  }
  const prefix = context.length ? `${context.join(" ")}. ` : "";
  const question = entry.question ? `Q: ${entry.question}. ` : "";
  return `${prefix}${question}${entry.text}`;
}

function dateToNumber(date: string | null | undefined): number {
  return date ? Number(date.replace("-", "")) : 0;
}

export function buildKnowledgeMetadata(entry: KnowledgeEntry) {
  const base = {
    source_owner: KNOWLEDGE_SOURCE_OWNER,
    section: entry.section,
    company: entry.company ?? "",
    role: entry.role ?? "",
    start_date: dateToNumber(entry.start_date),
    end_date: dateToNumber(entry.end_date),
    is_ongoing:
      entry.section === "experience" &&
      Boolean(entry.start_date) &&
      entry.end_date === null,
    skills: entry.skills,
    keywords: entry.keywords,
    depth: entry.depth ?? "surface",
    focus_tags: entry.focus_tags ?? [],
    is_core_strength: entry.is_core_strength ?? false,
    enrichedText: buildEnrichedText(entry),
  };
  if (entry.source_type === "qa_story" || entry.question) {
    return {
      ...base,
      chunk_type: "qa_story",
      question: entry.question ?? "",
      answer_summary: entry.answer_summary ?? "",
    };
  }
  return base;
}

export type KnowledgeMetadata = ReturnType<typeof buildKnowledgeMetadata>;
