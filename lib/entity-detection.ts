// Keyword → filter mapping (EN + KR aliases)
// Zero-latency lookup — no LLM call needed

export type DetectedFilter =
  | { type: "company"; value: string }
  | { type: "section"; value: string }
  | null;

const COMPANY_ALIASES: [RegExp, string][] = [
  [/devs?\s*united|데브스|\bdug\b/i, "Devs United Games"],
  [/flint|플린트/i, "Flint Technologies"],
  [/tmax|tibero|티맥스/i, "TmaxTibero"],
  [/\bkaist\b|카이스트/i, "KAIST"],
  [/\bkit\b|karlsruhe/i, "KIT"],
];

const SECTION_PATTERNS: [RegExp, string][] = [
  [/education|학력|degree|university|대학/i, "education"],
  [/award|honor|수상/i, "skills"], // awards stored under "skills" section
  [/leadership|extracurricular|리더십|과외활동/i, "leadership"],
];

// Overview chunk IDs per company for dynamic pinning
const COMPANY_OVERVIEW_IDS: Record<string, string> = {
  "Devs United Games": "exp-dug-overview",
  "Flint Technologies": "exp-flint-overview",
  "TmaxTibero": "exp-tmax-team-lead",
};

/**
 * Detects a company or section filter from a user query.
 * Companies take priority over sections.
 */
export function detectFilter(query: string): DetectedFilter {
  for (const [pattern, canonical] of COMPANY_ALIASES) {
    if (pattern.test(query)) return { type: "company", value: canonical };
  }
  for (const [pattern, section] of SECTION_PATTERNS) {
    if (pattern.test(query)) return { type: "section", value: section };
  }
  return null;
}

/**
 * Returns the overview chunk ID for a given company, or null.
 */
export function getCompanyOverviewId(company: string): string | null {
  return COMPANY_OVERVIEW_IDS[company] ?? null;
}
