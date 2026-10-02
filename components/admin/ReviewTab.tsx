"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Markdown from "react-markdown";
import {
  ReviewEditor,
  initialReviewDraft,
  type ReviewDraft,
} from "./ReviewEditor";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { PERSONA_OPTIONS } from "@/lib/domain/personas";
import { ADMIN_PERSONA_LABELS } from "@/lib/admin/persona-labels";
import type { ExchangeQuery } from "@/lib/domain/admin";

const RATING_COLORS: Record<string, string> = {
  good: "bg-green-100 text-green-800",
  needs_improvement: "bg-yellow-100 text-yellow-800",
};

export type ReviewWorkspace = {
  page: number;
  filter: ExchangeQuery["filter"];
  personaFilter: string;
  expandedSessionId: string | null;
  expandedExchangeId: number | null;
  drafts: Record<number, ReviewDraft>;
};
export function initialReviewWorkspace(): ReviewWorkspace {
  return {
    page: 1,
    filter: "all",
    personaFilter: "",
    expandedSessionId: null,
    expandedExchangeId: null,
    drafts: {},
  };
}

export function ReviewTab({
  refreshKey = 0,
  workspace,
  onWorkspaceChange,
}: {
  refreshKey?: number;
  workspace?: ReviewWorkspace;
  onWorkspaceChange?: Dispatch<SetStateAction<ReviewWorkspace>>;
}) {
  const [localWorkspace, setLocalWorkspace] = useState<ReviewWorkspace>(
    initialReviewWorkspace,
  );
  const current = workspace ?? localWorkspace;
  const update = onWorkspaceChange ?? setLocalWorkspace;
  const { page, filter, personaFilter, expandedSessionId, expandedExchangeId } =
    current;
  const setPage = (value: number) =>
    update((previous) => ({ ...previous, page: value }));
  const setFilter = (value: ExchangeQuery["filter"]) =>
    update((previous) => ({ ...previous, filter: value }));
  const setPersonaFilter = (value: string) =>
    update((previous) => ({ ...previous, personaFilter: value }));
  const setExpandedSessionId = (value: string | null) =>
    update((previous) => ({ ...previous, expandedSessionId: value }));
  const setExpandedExchangeId = (value: number | null) =>
    update((previous) => ({ ...previous, expandedExchangeId: value }));
  const { data, loading, error, refresh } = useAdminSessions({
    page,
    filter,
    persona: personaFilter || undefined,
  });
  useEffect(() => {
    if (refreshKey) void refresh();
  }, [refreshKey, refresh]);
  const sessions = data?.sessions ?? [];
  const totalSessions = data?.totalSessions ?? 0;
  const totalPages = Math.ceil(totalSessions / (data?.pageSize ?? 10));
  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          aria-label="Review filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as ExchangeQuery["filter"]);
            setPage(1);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="good">Rated: Good</option>
          <option value="needs_improvement">Rated: Needs Improvement</option>
        </select>
        <select
          aria-label="Persona filter"
          value={personaFilter}
          onChange={(e) => {
            setPersonaFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Personas</option>
          {PERSONA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.en}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">
          {totalSessions} session{totalSessions !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}{" "}
          <button onClick={() => void refresh()} className="underline">
            Retry
          </button>
        </p>
      )}
      {loading && !data ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No sessions found</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isOpen = expandedSessionId === session.session_id;
            const unreviewedCount = session.exchanges.filter(
              (e) => !e.reviewed_at,
            ).length;
            return (
              <div
                key={session.session_id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Session header */}
                <button
                  onClick={() => {
                    setExpandedSessionId(isOpen ? null : session.session_id);
                    setExpandedExchangeId(null);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400 shrink-0 text-xs">
                    {isOpen ? "\u25BC" : "\u25B6"}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(session.started_at).toLocaleString()}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
                    {ADMIN_PERSONA_LABELS[session.persona] ?? session.persona}
                  </span>
                  {session.focus && session.focus !== "full_stack" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 shrink-0">
                      {session.focus}
                    </span>
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 shrink-0"
                    title="Entry source"
                  >
                    {session.source ?? "direct"}
                  </span>
                  {session.visitor_email && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0"
                      title={session.visitor_email}
                    >
                      {session.visitor_email}
                    </span>
                  )}
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {session.exchanges[0]?.query}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {session.exchanges.length} Q
                    {session.exchanges.length !== 1 ? "s" : ""}
                  </span>
                  {unreviewedCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 shrink-0">
                      {unreviewedCount} unreviewed
                    </span>
                  )}
                </button>

                {/* Expanded: list of exchanges in this session */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {session.exchanges.map((ex, i) => (
                      <div
                        key={ex.id}
                        className={i > 0 ? "border-t border-gray-50" : ""}
                      >
                        {/* Exchange row */}
                        <button
                          onClick={() =>
                            setExpandedExchangeId(
                              expandedExchangeId === ex.id ? null : ex.id,
                            )
                          }
                          className="w-full px-4 py-2.5 pl-10 flex items-center gap-3 text-left hover:bg-blue-50/30 transition-colors"
                        >
                          <span className="text-xs text-gray-300 shrink-0 w-5 text-right">
                            {i + 1}.
                          </span>
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {ex.query}
                          </span>
                          {ex.dj_rating && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                RATING_COLORS[ex.dj_rating] ?? ""
                              }`}
                            >
                              {ex.dj_rating === "good"
                                ? "Good"
                                : "Needs Improvement"}
                            </span>
                          )}
                          {!ex.reviewed_at && (
                            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                          )}
                        </button>

                        {/* Expanded exchange detail */}
                        {expandedExchangeId === ex.id && (
                          <div className="bg-gray-50/50 px-4 py-4 pl-16 space-y-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Query
                              </p>
                              <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100">
                                {ex.query}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Response
                              </p>
                              <div className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100 prose prose-sm prose-gray max-w-none">
                                <Markdown>{ex.response}</Markdown>
                              </div>
                            </div>
                            {ex.chunks_used && ex.chunks_used.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Chunks Used ({ex.chunks_used.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {ex.chunks_used.map((c) => (
                                    <span
                                      key={c}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <ReviewEditor
                              key={ex.id}
                              exchange={ex}
                              onSaved={() => {
                                void refresh();
                              }}
                              draft={
                                current.drafts[ex.id] ?? initialReviewDraft(ex)
                              }
                              onDraftChange={(next) =>
                                update((previous) => {
                                  const currentDraft =
                                    previous.drafts[ex.id] ??
                                    initialReviewDraft(ex);
                                  return {
                                    ...previous,
                                    drafts: {
                                      ...previous.drafts,
                                      [ex.id]:
                                        typeof next === "function"
                                          ? next(currentDraft)
                                          : next,
                                    },
                                  };
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
