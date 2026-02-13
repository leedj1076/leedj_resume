// Keyword → canonical company name mapping (EN + KR aliases)
// Zero-latency lookup — no LLM call needed

const COMPANY_ALIASES: [RegExp, string][] = [
  [/devs?\s*united|데브스|\bdug\b/i, "Devs United Games"],
  [/flint|플린트/i, "Flint Technologies"],
  [/tmax|tibero|티맥스/i, "TmaxTibero"],
];

/**
 * Detects a company name from a user query string.
 * Returns the canonical Pinecone metadata value, or null if none matched.
 */
export function detectCompany(query: string): string | null {
  for (const [pattern, canonical] of COMPANY_ALIASES) {
    if (pattern.test(query)) return canonical;
  }
  return null;
}
