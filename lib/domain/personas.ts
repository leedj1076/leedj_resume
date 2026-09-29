export const PERSONAS = [
  "recruiter", "developer_partnerships", "vc", "founder_partner", "curious_visitor",
] as const;
export const FOCUSES = [
  "business_development", "ai_llms", "leadership_strategy", "full_stack",
] as const;

export type Persona = (typeof PERSONAS)[number];
export type Focus = (typeof FOCUSES)[number];
export interface VisitorData { persona: Persona; focus: Focus }
export interface PersonaLabel { en: string; kr: string }
export interface PersonaOption extends PersonaLabel { value: Persona }

export const PERSONA_OPTIONS: readonly PersonaOption[] = [
  { value: "recruiter", en: "Recruiter (Product Owner)", kr: "채용 담당자 (PO)" },
  { value: "developer_partnerships", en: "Recruiter (Strategic Partnerships)", kr: "채용 담당자 (전략 파트너십)" },
  { value: "vc", en: "VC", kr: "VC" },
  { value: "founder_partner", en: "Founder / Partner", kr: "창업자 / 파트너" },
  { value: "curious_visitor", en: "Curious Visitor", kr: "방문자" },
];

const PERSONA_ALIASES: Readonly<Record<string, Persona>> = Object.freeze({
  founder: "founder_partner", partner: "founder_partner", strategy: "vc",
  bd: "founder_partner", hiring: "recruiter", vc_investor: "vc",
  corporate_strategy: "vc", bd_partnerships: "founder_partner", hiring_manager: "recruiter",
});
const FOCUS_ALIASES: Readonly<Record<string, Focus>> = Object.freeze({
  bd: "business_development", ai: "ai_llms", leadership: "leadership_strategy", fullstack: "full_stack",
});

function ownValue(object: unknown, key: string): unknown {
  return object !== null && typeof object === "object" && !Array.isArray(object) &&
    Object.hasOwn(object, key) ? (object as Record<string, unknown>)[key] : undefined;
}

function resolvePersona(value: unknown): Persona | undefined {
  if (typeof value !== "string") return undefined;
  if ((PERSONAS as readonly string[]).includes(value)) return value as Persona;
  return Object.hasOwn(PERSONA_ALIASES, value) ? PERSONA_ALIASES[value] : undefined;
}

function resolveFocus(value: unknown): Focus | undefined {
  if (typeof value !== "string") return undefined;
  if ((FOCUSES as readonly string[]).includes(value)) return value as Focus;
  return Object.hasOwn(FOCUS_ALIASES, value) ? FOCUS_ALIASES[value] : undefined;
}

export function resolveVisitor(raw: unknown): VisitorData {
  return {
    persona: resolvePersona(ownValue(raw, "persona")) ?? "vc",
    focus: resolveFocus(ownValue(raw, "focus")) ?? "full_stack",
  };
}

function label(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function resolvePersonaOptions(visible: readonly string[] | undefined, labels: unknown): PersonaOption[] {
  const selected = new Set(visible);
  const filtered = PERSONA_OPTIONS.filter((option) => selected.has(option.value));
  const options = filtered.length ? filtered : PERSONA_OPTIONS;
  return options.map((option) => {
    const override = ownValue(labels, option.value);
    return {
      value: option.value,
      en: label(ownValue(override, "en"), option.en),
      kr: label(ownValue(override, "kr"), option.kr),
    };
  });
}
