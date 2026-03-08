import type { Persona, Focus, VisitorData } from "./types";

const VALID_PERSONAS: Persona[] = [
  "vc",
  "founder",
  "partner",
  "curious_visitor",
];

const VALID_FOCUSES: Focus[] = [
  "business_development",
  "ai_llms",
  "leadership_strategy",
  "full_stack",
];

export function validateVisitorData(raw: unknown): VisitorData {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "persona" in raw &&
    "focus" in raw &&
    VALID_PERSONAS.includes((raw as VisitorData).persona) &&
    VALID_FOCUSES.includes((raw as VisitorData).focus)
  ) {
    return { persona: (raw as VisitorData).persona, focus: (raw as VisitorData).focus };
  }
  return { persona: "vc", focus: "full_stack" };
}
