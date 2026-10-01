import { detectFilter, getCompanyOverviewId } from "../entity-detection";
import { FOCUS_SKILL_TERMS } from "../persona-config";
import type { VisitorData } from "../domain/personas";
import type { RetrievalPlan, RewriteResult } from "./types";

const BASE_PINNED_IDS = ["narrative-career-trajectory", "personal-summary"];
const FOCUSED_TOP_K = 8;
const RAW_QA_TOP_K = 5;

export function parseRewrite(raw: string, fallbackQuery: string): RewriteResult {
  const fallback: RewriteResult = { query: fallbackQuery, intent: "specific", clarifications: [] };
  try {
    const parsed: unknown = JSON.parse(raw.trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const fields = parsed as Record<string, unknown>;
    return {
      query: typeof fields.query === "string" && fields.query.trim() ? fields.query.trim() : fallbackQuery,
      intent: fields.intent === "broad" || fields.intent === "ambiguous" ? fields.intent : "specific",
      clarifications: Array.isArray(fields.clarifications)
        ? fields.clarifications.filter((value): value is string => typeof value === "string").slice(0, 3)
        : [],
    };
  } catch {
    return { ...fallback, query: raw.trim() || fallbackQuery };
  }
}

export function buildRetrievalPlan(input: { query: string; visitor: VisitorData; intent: RewriteResult["intent"] }): RetrievalPlan {
  const detected = detectFilter(input.query);
  const focusTerms = FOCUS_SKILL_TERMS[input.visitor.focus];
  const focusFilter = input.visitor.focus !== "full_stack" && focusTerms.length > 0
    ? { skills: { $in: focusTerms } } : null;
  const pinnedIds = [...BASE_PINNED_IDS];
  if (detected?.type === "company") {
    const overview = getCompanyOverviewId(detected.value);
    if (overview) pinnedIds.push(overview);
  }
  const kind = detected?.type ?? "general";
  return {
    kind,
    semanticTopK: kind === "general" ? 10 : 5,
    filteredTopK: kind === "company" ? 20 : kind === "general" ? null : 15,
    filter: detected?.type === "company" ? { company: { $eq: detected.value } }
      : detected?.type === "section" ? { section: { $eq: detected.value } }
      : detected?.type === "temporal" ? detected.filter : null,
    filterValue: detected && "value" in detected ? detected.value : undefined,
    pinnedIds,
    focusTopK: focusFilter ? FOCUSED_TOP_K : null,
    focusFilter,
    rawQaTopK: input.intent === "broad" ? null : RAW_QA_TOP_K,
  };
}
