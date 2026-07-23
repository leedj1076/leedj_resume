import type { Persona, Focus, VisitorData } from "./types";

const VALID_PERSONAS: Persona[] = [
  "recruiter",
  "vc",
  "founder_partner",
  "curious_visitor",
  "developer_partnerships",
];

// Old persona keys may arrive from stale client bundles or replayed sessions
const LEGACY_PERSONA_MAP: Record<string, Persona> = {
  founder: "founder_partner",
  partner: "founder_partner",
};

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
    "focus" in raw
  ) {
    const rawPersona = String((raw as { persona: unknown }).persona);
    const persona = VALID_PERSONAS.includes(rawPersona as Persona)
      ? (rawPersona as Persona)
      : LEGACY_PERSONA_MAP[rawPersona];
    const focus = (raw as VisitorData).focus;
    if (persona && VALID_FOCUSES.includes(focus)) {
      return { persona, focus };
    }
  }
  return { persona: "vc", focus: "full_stack" };
}
