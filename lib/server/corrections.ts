import "server-only";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { getResumeIndex } from "../pinecone";
import { EMBEDDING_MODEL } from "../domain/models";
import { reviewInputSchema, type ReviewInput, type ReviewResult } from "../domain/admin";
import { loadReviewExchange, updateReviewExchange } from "./exchanges";
import { HttpError } from "./http";

const failureMessage = "Review saved, but correction indexing failed. Retry this review to synchronize it.";

export async function saveReview(input: ReviewInput): Promise<ReviewResult> {
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "Invalid review");
  const { exchangeId, rating, comment, improvementText } = parsed.data;
  const exchange = await loadReviewExchange(exchangeId);
  if (!exchange) throw new HttpError(404, "exchange_not_found", "Exchange not found");

  const suppliedCorrection = improvementText?.trim() ? improvementText : null;
  const retryCorrection = exchange.correction_status === "failed" || exchange.correction_status === "pending"
    ? exchange.improvement_text : null;
  const correctionText = suppliedCorrection ?? retryCorrection;
  const shouldIndex = Boolean(correctionText);
  const saved = await updateReviewExchange(exchangeId, {
    dj_rating: rating,
    dj_comment: comment || null,
    reviewed_at: new Date().toISOString(),
    ...(suppliedCorrection ? { improvement_text: suppliedCorrection } : {}),
    ...(shouldIndex ? { correction_status: "pending", correction_error: null, pinecone_chunk_id: null } : {}),
  });

  if (!shouldIndex) {
    return { success: true, pineconeChunkId: saved.pinecone_chunk_id, correctionStatus: saved.correction_status };
  }

  const chunkId = `dj-correction-${exchangeId}`;
  try {
    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: exchange.query.slice(0, 2000),
    });
    await getResumeIndex().namespace("resume").upsert({ records: [{
      id: chunkId,
      values: embedding,
      metadata: {
        enrichedText: correctionText!,
        section: "dj_correction",
        depth: "surface",
        skills: [],
        is_core_strength: false,
        source: "admin_review",
        original_query: exchange.query.slice(0, 500),
      },
    }] });
    await updateReviewExchange(exchangeId, {
      correction_status: "applied", correction_error: null, pinecone_chunk_id: chunkId,
    });
    return { success: true, pineconeChunkId: chunkId, correctionStatus: "applied" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    try {
      await updateReviewExchange(exchangeId, { correction_status: "failed", correction_error: detail });
    } catch {
      // The saved pending intent remains retryable even if failure recording is unavailable.
    }
    return { success: false, pineconeChunkId: null, correctionStatus: "failed", correctionError: failureMessage };
  }
}
