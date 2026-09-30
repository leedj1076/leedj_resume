import "server-only";
import { randomUUID } from "node:crypto";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { getResumeIndex } from "../pinecone";
import { EMBEDDING_MODEL } from "../domain/models";
import { reviewInputSchema, type ReviewInput, type ReviewResult } from "../domain/admin";
import { claimReviewExchange, finishReviewExchange, loadReviewExchange, recordUncertainCorrection } from "./exchanges";
import { HttpError } from "./http";

const failureMessage = "Review saved, but correction indexing failed. Retry this review to synchronize it.";
const heldClaimMessage = "Review saved, but synchronization could not be confirmed. An administrator must verify provider activity has ended before releasing this review claim.";

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function releaseAfterConfirmedFailure(exchangeId: number, ownerToken: string, error: unknown): Promise<ReviewResult> {
  let failureRecorded = false;
  try {
    failureRecorded = Boolean(await finishReviewExchange(exchangeId, ownerToken, "failed", null, errorDetail(error)));
  } catch {
    // Without acknowledgement, retain the claim and require manual recovery.
  }
  return { success: false, pineconeChunkId: null, correctionStatus: "failed", correctionError: failureRecorded ? failureMessage : heldClaimMessage };
}

export async function saveReview(input: ReviewInput): Promise<ReviewResult> {
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "Invalid review");
  const { exchangeId } = parsed.data;
  const ownerToken = randomUUID();
  const saved = await claimReviewExchange(parsed.data, ownerToken);
  if (!saved) {
    if (!await loadReviewExchange(exchangeId)) throw new HttpError(404, "exchange_not_found", "Exchange not found");
    throw new HttpError(409, "review_in_progress", "A review for this exchange is already in progress");
  }

  const correctionText = saved.correction_status === "pending" ? saved.improvement_text : null;
  const shouldIndex = Boolean(correctionText);

  if (!shouldIndex) {
    try {
      const released = await finishReviewExchange(exchangeId, ownerToken, null);
      if (!released) throw new Error("Review claim lost before release");
      return { success: true, pineconeChunkId: released.pinecone_chunk_id, correctionStatus: released.correction_status };
    } catch {
      return { success: false, pineconeChunkId: null, correctionStatus: "failed", correctionError: heldClaimMessage };
    }
  }

  const chunkId = `dj-correction-${exchangeId}`;
  let embedding: number[];
  try {
    ({ embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: saved.query.slice(0, 2000),
    }));
  } catch (error) {
    return releaseAfterConfirmedFailure(exchangeId, ownerToken, error);
  }

  try {
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
        original_query: saved.query.slice(0, 500),
      },
    }] });
  } catch (error) {
    try {
      await recordUncertainCorrection(exchangeId, ownerToken, errorDetail(error));
    } catch {
      // The pending intent and owner claim remain if even failure recording is unavailable.
    }
    return { success: false, pineconeChunkId: null, correctionStatus: "failed", correctionError: heldClaimMessage };
  }

  try {
    const applied = await finishReviewExchange(exchangeId, ownerToken, "applied", chunkId);
    if (!applied) throw new Error("Review claim lost before acknowledgement");
    return { success: true, pineconeChunkId: chunkId, correctionStatus: "applied" };
  } catch (error) {
    return releaseAfterConfirmedFailure(exchangeId, ownerToken, error);
  }
}
