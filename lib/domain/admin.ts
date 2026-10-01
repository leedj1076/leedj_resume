import { z } from "zod";
import { PERSONAS } from "./personas";

export const exchangeSchema = z.object({
  id: z.number().int().positive(),
  created_at: z.string().datetime({ offset: true }),
  session_id: z.string(),
  persona: z.string(),
  focus: z.string(),
  lang: z.string(),
  query: z.string(),
  response: z.string(),
  chunks_used: z.array(z.string()).nullable(),
  visitor_email: z.string().nullable(),
  source: z.string().nullable(),
  dj_rating: z.enum(["good", "needs_improvement"]).nullable(),
  dj_comment: z.string().nullable(),
  improvement_text: z.string().nullable(),
  pinecone_chunk_id: z.string().nullable(),
  reviewed_at: z.string().datetime({ offset: true }).nullable(),
  correction_status: z.enum(["none", "pending", "applied", "failed"]).default("none"),
  correction_error: z.string().nullable().default(null),
});
export type Exchange = z.infer<typeof exchangeSchema>;

export const reviewInputSchema = z.object({
  exchangeId: z.number().int().positive(),
  rating: z.enum(["good", "needs_improvement"]),
  comment: z.string().optional(),
  improvementText: z.string().optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type CorrectionStatus = Exchange["correction_status"];
export type ReviewResult = {
  success: boolean;
  pineconeChunkId: string | null;
  correctionStatus: CorrectionStatus;
  correctionError?: string;
};
export const reviewResultSchema = z.object({
  success: z.boolean(),
  pineconeChunkId: z.string().nullable(),
  correctionStatus: z.enum(["none", "pending", "applied", "failed"]),
  correctionError: z.string().optional(),
});

export const sessionSchema = z.object({
  session_id: z.string(), persona: z.string(), focus: z.string(), lang: z.string(),
  started_at: z.string(), visitor_email: z.string().nullable(), source: z.string().nullable(),
  exchanges: z.array(exchangeSchema),
});
export type Session = z.infer<typeof sessionSchema>;

export const statsSchema = z.object({
  totalSessions: z.number(), totalExchanges: z.number(), avgExchangesPerSession: z.number(),
  reviewed: z.number(), unreviewed: z.number(),
  personaCounts: z.record(z.string(), z.number()), focusCounts: z.record(z.string(), z.number()),
  ratingCounts: z.record(z.string(), z.number()), langCounts: z.record(z.string(), z.number()),
  dailySessions: z.record(z.string(), z.number()), dailyExchanges: z.record(z.string(), z.number()),
});
export type Stats = z.infer<typeof statsSchema>;

export const personaLabelsSchema = z.record(z.string(), z.object({ en: z.string(), kr: z.string() }));
export const appSettingsSchema = z.object({
  mode: z.enum(["default", "pyramid"]),
  visiblePersonas: z.array(z.enum(PERSONAS)),
  personaLabels: personaLabelsSchema,
});
export type AppSettings = z.infer<typeof appSettingsSchema>;
export const settingsPatchSchema = appSettingsSchema.partial().strict();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const exchangeQuerySchema = z.object({
  page: z.number().int().positive(),
  persona: z.string().min(1).optional(),
  filter: z.enum(["all", "unreviewed", "reviewed", "good", "needs_improvement"]),
});
export type ExchangeQuery = z.infer<typeof exchangeQuerySchema>;

export const exchangePageSchema = z.object({ exchanges: z.array(exchangeSchema), total: z.number(), page: z.number(), pageSize: z.number() });
export type ExchangePage = z.infer<typeof exchangePageSchema>;
export const sessionPageSchema = z.object({ sessions: z.array(sessionSchema), totalSessions: z.number(), page: z.number(), pageSize: z.number() });
export type SessionPage = z.infer<typeof sessionPageSchema>;
