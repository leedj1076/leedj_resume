import { z } from "zod";
import { FOCUSES } from "./personas";

export const KNOWLEDGE_SECTIONS = [
  "summary", "skills", "education", "experience", "leadership", "awards", "project", "stories",
  "motivation", "career_transition", "founder_philosophy", "failure_learning",
  "founder_empathy", "narrative", "investment_philosophy",
  "final_40_resume_narrative", "deep_dive_changjo_2026", "deep_dive_career_pattern",
  "deep_dive_flint_failure",
] as const;

const CalendarMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// The runtime contract accepts every currently authored resume and interview entry.
export const KnowledgeEntrySchema = z.object({
  chunk_id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  question: z.string().optional(),
  answer_summary: z.string().optional(),
  text: z.string().min(1),
  source_type: z.enum(["resume", "qa_story", "interview_qa"]),
  section: z.enum(KNOWLEDGE_SECTIONS),
  company: z.string().nullable(),
  role: z.string().nullable(),
  start_date: CalendarMonthSchema.nullable().optional(),
  end_date: CalendarMonthSchema.nullable().optional(),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  token_count: z.number().int().nonnegative(),
  depth: z.enum(["surface", "deep_dive"]),
  focus_tags: z.array(z.string()),
  is_core_strength: z.boolean(),
});
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

// New generated Q&A records have stronger authoring requirements than legacy data.
export const NewKnowledgeEntrySchema = KnowledgeEntrySchema.extend({
  chunk_id: z.string().regex(/^[a-z0-9-]+$/),
  question: z.string().min(10),
  answer_summary: z.string().min(20).max(300),
  text: z.string().min(50),
  source_type: z.literal("qa_story"),
  focus_tags: z.array(z.enum(FOCUSES)),
  start_date: CalendarMonthSchema.nullable(),
  end_date: CalendarMonthSchema.nullable(),
});
