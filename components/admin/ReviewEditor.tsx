"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { adminRequest, AdminRequestError } from "@/lib/admin/client";
import { reviewResultSchema, type Exchange, type ReviewInput, type ReviewResult } from "@/lib/domain/admin";

export type ReviewDraft = { rating: ReviewInput["rating"] | null; comment: string; improvement: string };
export function initialReviewDraft(exchange: Exchange): ReviewDraft {
  return { rating: exchange.dj_rating, comment: exchange.dj_comment ?? "", improvement: exchange.improvement_text ?? "" };
}

export function ReviewEditor({ exchange, onSaved, draft, onDraftChange }: {
  exchange: Exchange;
  onSaved: () => void;
  draft?: ReviewDraft;
  onDraftChange?: Dispatch<SetStateAction<ReviewDraft>>;
}) {
  const [localDraft, setLocalDraft] = useState<ReviewDraft>(() => initialReviewDraft(exchange));
  const currentDraft = draft ?? localDraft;
  const setDraft = onDraftChange ?? setLocalDraft;
  const { rating, comment, improvement } = currentDraft;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const submit = async () => {
    if (!rating || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      const result = await adminRequest("/api/admin/review", {
        exchangeId: exchange.id, rating, comment,
        improvementText: rating === "needs_improvement" ? improvement : undefined,
      }, reviewResultSchema);
      if (!mounted.current) return;
      if (!result.success || result.correctionStatus === "failed") {
        setError(result.correctionError ?? "The review could not be completed. Check its status before retrying.");
        return;
      }
      setStatus(result.correctionStatus === "applied" ? "Saved and correction applied" : result.correctionStatus === "pending" ? "Review saved; correction pending" : "Saved");
      onSaved();
    } catch (failure) {
      if (!mounted.current) return;
      const review = failure instanceof AdminRequestError ? reviewResultSchema.safeParse(failure.payload) : null;
      const details: ReviewResult | null = review?.success ? review.data : null;
      setError(details?.correctionError ?? (failure instanceof Error ? failure.message : "Unable to save review."));
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return <div className="border-t border-gray-200 pt-4">
    <p className="text-xs font-medium text-gray-500 mb-2">Review</p>
    <div className="flex gap-2 mb-3">
      <button type="button" aria-pressed={rating === "good"} onClick={() => { setDraft((current) => ({ ...current, rating: "good" })); setStatus(null); }} className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${rating === "good" ? "bg-green-50 border-green-300 text-green-800" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>Good</button>
      <button type="button" aria-pressed={rating === "needs_improvement"} onClick={() => { setDraft((current) => ({ ...current, rating: "needs_improvement" })); setStatus(null); }} className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${rating === "needs_improvement" ? "bg-yellow-50 border-yellow-300 text-yellow-800" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>Needs Improvement</button>
    </div>
    <label className="sr-only" htmlFor={`review-comment-${exchange.id}`}>Review comment</label>
    <textarea id={`review-comment-${exchange.id}`} value={comment} onChange={(event) => { setDraft((current) => ({ ...current, comment: event.target.value })); setStatus(null); }} placeholder="Comment (optional)" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    {rating === "needs_improvement" && <><label className="sr-only" htmlFor={`review-improvement-${exchange.id}`}>Improved answer</label><textarea id={`review-improvement-${exchange.id}`} value={improvement} onChange={(event) => { setDraft((current) => ({ ...current, improvement: event.target.value })); setStatus(null); }} placeholder="Write the improved answer (will be stored as a correction chunk in Pinecone)" rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></>}
    <div><button type="button" onClick={() => void submit()} disabled={!rating || submitting} className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{submitting ? "Saving..." : "Submit Review"}</button></div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {status && <p role="status" className="mt-2 text-sm text-green-700">{status}</p>}
  </div>;
}
