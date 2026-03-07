// Keyword → filter mapping (EN + KR aliases)
// Zero-latency lookup — no LLM call needed

export type DetectedFilter =
  | { type: "company"; value: string }
  | { type: "section"; value: string }
  | { type: "temporal"; filter: Record<string, unknown> }
  | null;

const COMPANY_ALIASES: [RegExp, string][] = [
  [/changjo|창조건축|창조/i, "Changjo Architecture"],
  [/devs?\s*united|데브스|\bdug\b/i, "Devs United Games"],
  [/flint|플린트/i, "Flint Technologies"],
  [/tmax|tibero|티맥스/i, "TmaxTibero"],
  [/altos|알토스/i, "Altos Ventures"],
  [/\bkaist\b|카이스트/i, "KAIST"],
  [/\bkit\b|karlsruhe/i, "KIT"],
];

const SECTION_PATTERNS: [RegExp, string][] = [
  [/education|학력|degree|university|대학/i, "education"],
  [/award|honor|수상/i, "awards"],
  [/leadership|extracurricular|리더십|과외활동/i, "leadership"],
];

// Overview chunk IDs per company for dynamic pinning
const COMPANY_OVERVIEW_IDS: Record<string, string> = {
  "Changjo Architecture": "exp-changjo-current",
  "Devs United Games": "exp-dug-overview",
  "Flint Technologies": "exp-flint-overview",
  "TmaxTibero": "exp-tmax-team-lead",
};

// "most recent" patterns — maps to current role
const RECENCY_PATTERN = /most recent|latest|current|last role|가장 최근|현재/i;

/**
 * Detects a company, section, or temporal filter from a user query.
 * Priority: company > temporal > section.
 */
export function detectFilter(query: string): DetectedFilter {
  // 1. Company detection (highest priority)
  for (const [pattern, canonical] of COMPANY_ALIASES) {
    if (pattern.test(query)) return { type: "company", value: canonical };
  }

  // 2. Recency detection ("most recent role", "latest", etc.)
  if (RECENCY_PATTERN.test(query)) {
    return { type: "company", value: "Changjo Architecture" };
  }

  // 3. Year-based temporal detection ("in 2020", "during 2019")
  // Dates stored as numeric YYYYMM in Pinecone (e.g., 202012)
  const yearMatch = query.match(/\b(20[12]\d)\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return {
      type: "temporal",
      filter: {
        $and: [
          { start_date: { $lte: year * 100 + 12 } },
          { end_date: { $gte: year * 100 + 1 } },
        ],
      },
    };
  }

  // 4. Section detection
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
