import { PERSONA_OPTIONS } from "@/lib/domain/personas";

export const ADMIN_PERSONA_LABELS: Record<string, string> = {
  ...Object.fromEntries(PERSONA_OPTIONS.map((option) => [option.value, option.en])),
  // Historical values remain readable in old sessions and analytics.
  founder: "Founder", partner: "Partner", hiring_manager: "Hiring Manager",
  vc_investor: "Investor", bd_partnerships: "BD / Partnerships", corporate_strategy: "Corporate Strategy",
};
