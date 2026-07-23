"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Markdown from "react-markdown";
import { V14_PERSONA_OPTIONS } from "@/lib/profile-data";

interface Exchange {
  id: number;
  created_at: string;
  session_id: string;
  persona: string;
  focus: string;
  lang: string;
  query: string;
  response: string;
  chunks_used: string[] | null;
  dj_rating: string | null;
  dj_comment: string | null;
  improvement_text: string | null;
  pinecone_chunk_id: string | null;
  reviewed_at: string | null;
}

interface Session {
  session_id: string;
  persona: string;
  focus: string;
  lang: string;
  started_at: string;
  visitor_email: string | null;
  source: string | null;
  exchanges: Exchange[];
}

interface Stats {
  totalSessions: number;
  totalExchanges: number;
  avgExchangesPerSession: number;
  reviewed: number;
  unreviewed: number;
  personaCounts: Record<string, number>;
  focusCounts: Record<string, number>;
  ratingCounts: Record<string, number>;
  langCounts: Record<string, number>;
  dailySessions: Record<string, number>;
  dailyExchanges: Record<string, number>;
}

const PERSONA_LABELS: Record<string, string> = {
  vc: "VC",
  founder: "Founder",
  partner: "Partner",
  curious_visitor: "Curious Visitor",
  // Legacy labels for historical data
  hiring_manager: "Hiring Manager",
  vc_investor: "Investor",
  bd_partnerships: "BD / Partnerships",
  corporate_strategy: "Corporate Strategy",
};

const RATING_COLORS: Record<string, string> = {
  good: "bg-green-100 text-green-800",
  needs_improvement: "bg-yellow-100 text-yellow-800",
};

type PersonaLabelMap = Record<string, { en: string; kr: string }>;

const DEFAULT_PERSONA_LABELS: PersonaLabelMap = Object.fromEntries(
  V14_PERSONA_OPTIONS.map((o) => [o.value, { en: o.en, kr: o.kr }])
);

export default function AdminDashboard() {
  // Force light mode — admin page uses hardcoded light backgrounds
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => { if (wasDark) html.classList.add("dark"); };
  }, []);

  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [checking, setChecking] = useState(true);
  const passwordRef = useRef("");

  const [tab, setTab] = useState<"review" | "analytics" | "settings">("review");

  // Review state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [personaFilter, setPersonaFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedExchangeId, setExpandedExchangeId] = useState<number | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState<string>("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImprovement, setReviewImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Analytics state
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Settings state
  const [answerMode, setAnswerMode] = useState<string>("default");
  // savedPersonas = last applied (server truth); draftPersonas = pending toggles
  const [savedPersonas, setSavedPersonas] = useState<string[]>(
    V14_PERSONA_OPTIONS.map((o) => o.value)
  );
  const [draftPersonas, setDraftPersonas] = useState<string[]>(
    V14_PERSONA_OPTIONS.map((o) => o.value)
  );
  const [savedLabels, setSavedLabels] = useState<PersonaLabelMap>(DEFAULT_PERSONA_LABELS);
  const [draftLabels, setDraftLabels] = useState<PersonaLabelMap>(DEFAULT_PERSONA_LABELS);
  const [personasSaving, setPersonasSaving] = useState(false);
  const [personasSaved, setPersonasSaved] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Auto-login from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("admin_password");
    if (!saved) { setChecking(false); return; }
    fetch("/api/admin/exchanges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: saved, page: 1, view: "sessions" }),
    }).then(async (res) => {
      if (res.ok) {
        passwordRef.current = saved;
        setAuthenticated(true);
        const data = await res.json();
        setSessions(data.sessions ?? []);
        setTotalSessions(data.totalSessions ?? 0);
      } else {
        localStorage.removeItem("admin_password");
      }
    }).catch(() => {
      localStorage.removeItem("admin_password");
    }).finally(() => setChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = async () => {
    try {
      const res = await fetch("/api/admin/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput, page: 1, view: "sessions" }),
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      passwordRef.current = passwordInput;
      localStorage.setItem("admin_password", passwordInput);
      setAuthenticated(true);
      setAuthError(false);
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setTotalSessions(data.totalSessions ?? 0);
    } catch {
      setAuthError(true);
    }
  };

  const fetchSessions = useCallback(
    async (p: number, f: string, persona: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/exchanges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: passwordRef.current,
            page: p,
            filter: f,
            persona: persona || undefined,
            view: "sessions",
          }),
        });
        const data = await res.json();
        setSessions(data.sessions ?? []);
        setTotalSessions(data.totalSessions ?? 0);
        setPage(p);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordRef.current }),
      });
      const data = await res.json();
      setStats(data);
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordRef.current }),
      });
      const data = await res.json();
      if (data.mode) setAnswerMode(data.mode);
      if (Array.isArray(data.visiblePersonas) && data.visiblePersonas.length > 0) {
        setSavedPersonas(data.visiblePersonas);
        setDraftPersonas(data.visiblePersonas);
      }
      if (data.personaLabels && typeof data.personaLabels === "object") {
        setSavedLabels(data.personaLabels);
        setDraftLabels(data.personaLabels);
      }
      setSettingsLoaded(true);
    } catch {
      setSettingsLoaded(true);
    }
  }, []);

  const saveAnswerMode = useCallback(
    async (mode: string) => {
      setSettingsSaving(true);
      setSettingsSaved(false);
      try {
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: passwordRef.current, mode }),
        });
        setAnswerMode(mode);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
      } catch {
        /* ignore */
      } finally {
        setSettingsSaving(false);
      }
    },
    []
  );

  // Toggle only mutates the draft — nothing persists until Apply is clicked.
  const handleTogglePersona = useCallback((value: string) => {
    setPersonasSaved(false);
    setDraftPersonas((cur) => {
      const isOn = cur.includes(value);
      const next = isOn ? cur.filter((v) => v !== value) : [...cur, value];
      return next.length === 0 ? cur : next; // keep at least one visible
    });
  }, []);

  const handleLabelChange = useCallback(
    (value: string, lang: "en" | "kr", text: string) => {
      setPersonasSaved(false);
      setDraftLabels((cur) => ({
        ...cur,
        [value]: { ...cur[value], [lang]: text },
      }));
    },
    []
  );

  const applyPersonaSettings = useCallback(async () => {
    if (draftPersonas.length === 0) return; // guard: never hide every persona
    setPersonasSaving(true);
    setPersonasSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordRef.current,
          visiblePersonas: draftPersonas,
          personaLabels: draftLabels,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.visiblePersonas) && data.visiblePersonas.length > 0) {
        setSavedPersonas(data.visiblePersonas);
        setDraftPersonas(data.visiblePersonas);
      }
      if (data.personaLabels && typeof data.personaLabels === "object") {
        // Server trims/backfills blanks — sync draft to the effective values.
        setSavedLabels(data.personaLabels);
        setDraftLabels(data.personaLabels);
      }
      setPersonasSaved(true);
      setTimeout(() => setPersonasSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setPersonasSaving(false);
    }
  }, [draftPersonas, draftLabels]);

  useEffect(() => {
    if (authenticated && tab === "analytics" && !stats) {
      fetchStats();
    }
  }, [authenticated, tab, stats, fetchStats]);

  useEffect(() => {
    if (authenticated && tab === "settings" && !settingsLoaded) {
      fetchSettings();
    }
  }, [authenticated, tab, settingsLoaded, fetchSettings]);

  const handleSessionToggle = (sid: string) => {
    setExpandedSessionId(expandedSessionId === sid ? null : sid);
    setExpandedExchangeId(null);
  };

  const handleExchangeExpand = (ex: Exchange) => {
    if (expandedExchangeId === ex.id) {
      setExpandedExchangeId(null);
      return;
    }
    setExpandedExchangeId(ex.id);
    setReviewRating(ex.dj_rating ?? "");
    setReviewComment(ex.dj_comment ?? "");
    setReviewImprovement(ex.improvement_text ?? "");
  };

  const handleReviewSubmit = async (exchangeId: number) => {
    if (!reviewRating) return;
    setSubmitting(true);
    try {
      await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordRef.current,
          exchangeId,
          rating: reviewRating,
          comment: reviewComment,
          improvementText:
            reviewRating === "needs_improvement" ? reviewImprovement : undefined,
        }),
      });
      await fetchSessions(page, filter, personaFilter);
      setExpandedExchangeId(null);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalSessions / 10);

  // --- Password gate ---
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Checking session...</p>
      </div>
    );
  }
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
          <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth();
            }}
          >
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {authError && (
              <p className="text-sm text-red-600 mb-3">Invalid password</p>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Authenticated dashboard ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              Admin Dashboard
            </h1>
            <button
              onClick={() => {
                if (tab === "review") fetchSessions(page, filter, personaFilter);
                else if (tab === "analytics") fetchStats();
              }}
              title="Refresh data"
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            </button>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab("review")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "review"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Q&A Review
            </button>
            <button
              onClick={() => setTab("analytics")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "analytics"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setTab("settings")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "settings"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {tab === "review" ? (
          <ReviewTab
            sessions={sessions}
            totalSessions={totalSessions}
            page={page}
            totalPages={totalPages}
            filter={filter}
            personaFilter={personaFilter}
            loading={loading}
            expandedSessionId={expandedSessionId}
            expandedExchangeId={expandedExchangeId}
            reviewRating={reviewRating}
            reviewComment={reviewComment}
            reviewImprovement={reviewImprovement}
            submitting={submitting}
            onFilterChange={(f) => {
              setFilter(f);
              fetchSessions(1, f, personaFilter);
            }}
            onPersonaChange={(p) => {
              setPersonaFilter(p);
              fetchSessions(1, filter, p);
            }}
            onPageChange={(p) => fetchSessions(p, filter, personaFilter)}
            onSessionToggle={handleSessionToggle}
            onExchangeExpand={handleExchangeExpand}
            onRatingChange={setReviewRating}
            onCommentChange={setReviewComment}
            onImprovementChange={setReviewImprovement}
            onSubmitReview={handleReviewSubmit}
          />
        ) : tab === "analytics" ? (
          <AnalyticsTab stats={stats} loading={statsLoading} />
        ) : (
          <SettingsTab
            answerMode={answerMode}
            draftPersonas={draftPersonas}
            savedPersonas={savedPersonas}
            draftLabels={draftLabels}
            savedLabels={savedLabels}
            personasSaving={personasSaving}
            personasSaved={personasSaved}
            saving={settingsSaving}
            saved={settingsSaved}
            onModeChange={saveAnswerMode}
            onTogglePersona={handleTogglePersona}
            onLabelChange={handleLabelChange}
            onApplyPersonaSettings={applyPersonaSettings}
          />
        )}
      </main>
    </div>
  );
}

// ─── Review Tab ──────────────────────────────────────────────

function ReviewTab({
  sessions,
  totalSessions,
  page,
  totalPages,
  filter,
  personaFilter,
  loading,
  expandedSessionId,
  expandedExchangeId,
  reviewRating,
  reviewComment,
  reviewImprovement,
  submitting,
  onFilterChange,
  onPersonaChange,
  onPageChange,
  onSessionToggle,
  onExchangeExpand,
  onRatingChange,
  onCommentChange,
  onImprovementChange,
  onSubmitReview,
}: {
  sessions: Session[];
  totalSessions: number;
  page: number;
  totalPages: number;
  filter: string;
  personaFilter: string;
  loading: boolean;
  expandedSessionId: string | null;
  expandedExchangeId: number | null;
  reviewRating: string;
  reviewComment: string;
  reviewImprovement: string;
  submitting: boolean;
  onFilterChange: (f: string) => void;
  onPersonaChange: (p: string) => void;
  onPageChange: (p: number) => void;
  onSessionToggle: (sid: string) => void;
  onExchangeExpand: (ex: Exchange) => void;
  onRatingChange: (r: string) => void;
  onCommentChange: (c: string) => void;
  onImprovementChange: (t: string) => void;
  onSubmitReview: (id: number) => void;
}) {
  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="good">Rated: Good</option>
          <option value="needs_improvement">Rated: Needs Improvement</option>
        </select>
        <select
          value={personaFilter}
          onChange={(e) => onPersonaChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Personas</option>
          <option value="recruiter">Recruiter</option>
          <option value="vc">VC</option>
          <option value="founder_partner">Founder / Partner</option>
          <option value="curious_visitor">Curious Visitor</option>
        </select>
        <span className="text-sm text-gray-500 self-center">
          {totalSessions} session{totalSessions !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No sessions found
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isOpen = expandedSessionId === session.session_id;
            const unreviewedCount = session.exchanges.filter((e) => !e.reviewed_at).length;
            return (
              <div
                key={session.session_id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Session header */}
                <button
                  onClick={() => onSessionToggle(session.session_id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400 shrink-0 text-xs">
                    {isOpen ? "\u25BC" : "\u25B6"}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(session.started_at).toLocaleString()}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
                    {PERSONA_LABELS[session.persona] ?? session.persona}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 shrink-0">
                    {session.focus}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 shrink-0"
                    title="Entry source"
                  >
                    {session.source ?? "direct"}
                  </span>
                  {session.visitor_email && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0" title={session.visitor_email}>
                      {session.visitor_email}
                    </span>
                  )}
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {session.exchanges[0]?.query}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {session.exchanges.length} Q{session.exchanges.length !== 1 ? "s" : ""}
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
                          onClick={() => onExchangeExpand(ex)}
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
                              {ex.dj_rating === "good" ? "Good" : "Needs Improvement"}
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
                              <p className="text-xs font-medium text-gray-500 mb-1">Query</p>
                              <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100">
                                {ex.query}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Response</p>
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
                                    <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Review form */}
                            <div className="border-t border-gray-200 pt-4">
                              <p className="text-xs font-medium text-gray-500 mb-2">Review</p>
                              <div className="flex gap-2 mb-3">
                                <button
                                  onClick={() => onRatingChange("good")}
                                  className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                                    reviewRating === "good"
                                      ? "bg-green-50 border-green-300 text-green-800"
                                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  Good
                                </button>
                                <button
                                  onClick={() => onRatingChange("needs_improvement")}
                                  className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                                    reviewRating === "needs_improvement"
                                      ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  Needs Improvement
                                </button>
                              </div>
                              <textarea
                                value={reviewComment}
                                onChange={(e) => onCommentChange(e.target.value)}
                                placeholder="Comment (optional)"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {reviewRating === "needs_improvement" && (
                                <textarea
                                  value={reviewImprovement}
                                  onChange={(e) => onImprovementChange(e.target.value)}
                                  placeholder="Write the improved answer (will be stored as a correction chunk in Pinecone)"
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              )}
                              <button
                                onClick={() => onSubmitReview(ex.id)}
                                disabled={!reviewRating || submitting}
                                className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {submitting ? "Saving..." : "Submit Review"}
                              </button>
                            </div>
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
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
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

// ─── Analytics Tab ───────────────────────────────────────────

function AnalyticsTab({
  stats,
  loading,
}: {
  stats: Stats | null;
  loading: boolean;
}) {
  if (loading || !stats) {
    return (
      <div className="text-center py-12 text-gray-400">
        {loading ? "Loading analytics..." : "No data"}
      </div>
    );
  }

  const maxDaily = Math.max(
    ...Object.values(stats.dailySessions),
    ...Object.values(stats.dailyExchanges),
    1
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Sessions" value={stats.totalSessions} />
        <SummaryCard label="Total Exchanges" value={stats.totalExchanges} />
        <SummaryCard label="Avg per Session" value={stats.avgExchangesPerSession} color="blue" />
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Reviewed / Unreviewed</p>
          <p className="text-2xl font-semibold">
            <span className="text-green-700">{stats.reviewed}</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-orange-600">{stats.unreviewed}</span>
          </p>
        </div>
      </div>

      {/* Distribution sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DistributionCard
          title="Persona Distribution (by session)"
          data={stats.personaCounts}
          labels={PERSONA_LABELS}
          color="blue"
        />
        <DistributionCard
          title="Focus Area Distribution (by session)"
          data={stats.focusCounts}
          color="purple"
        />
        <DistributionCard
          title="Rating Distribution (by exchange)"
          data={stats.ratingCounts}
          labels={{ good: "Good", needs_improvement: "Needs Improvement", unrated: "Unrated" }}
          color="green"
        />
        <DistributionCard
          title="Language Distribution (by session)"
          data={stats.langCounts}
          labels={{ en: "English", ko: "Korean" }}
          color="indigo"
        />
      </div>

      {/* Daily volume chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Daily Volume (Last 14 Days)
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
              Sessions
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-300" />
              Exchanges
            </span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-32">
          {Object.keys(stats.dailySessions).map((day) => {
            const sessions = stats.dailySessions[day] ?? 0;
            const exchanges = stats.dailyExchanges[day] ?? 0;
            return (
              <div
                key={day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs text-gray-500">
                  {exchanges || sessions ? `${sessions}/${exchanges}` : ""}
                </span>
                <div className="w-full flex gap-[1px] items-end" style={{ height: `${(Math.max(sessions, exchanges) / maxDaily) * 100}%`, minHeight: (sessions > 0 || exchanges > 0) ? "4px" : "0px" }}>
                  <div
                    className="flex-1 bg-blue-600 rounded-t"
                    style={{
                      height: sessions > 0 ? `${(sessions / Math.max(sessions, exchanges)) * 100}%` : "0px",
                      minHeight: sessions > 0 ? "4px" : "0px",
                    }}
                  />
                  <div
                    className="flex-1 bg-blue-300 rounded-t"
                    style={{
                      height: exchanges > 0 ? `${(exchanges / Math.max(sessions, exchanges)) * 100}%` : "0px",
                      minHeight: exchanges > 0 ? "4px" : "0px",
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
                  {day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────

const MODES = [
  {
    id: "default",
    label: "Conversational",
    description:
      "Warm and natural — like chatting over coffee. Uses overview first, then goes deeper on follow-up questions.",
    example:
      "\"I've spent 15+ years bridging tech and business across Korea and the US...\n\n• **Samsung SDS** — Led a 40-person engineering team...\n• **Flint** — Co-founded and scaled to $2M ARR...\n\nWant me to dive deeper into any of these?\"",
  },
  {
    id: "pyramid",
    label: "Pyramid Principle",
    description:
      "Barbara Minto's framework — lead with the direct answer first, support with logically grouped arguments (MECE), back each with specific evidence.",
    example:
      "\"I bring 15+ years of cross-functional leadership across AI, BD, and venture capital.\n\n**Proven operator who scales revenue**\n• Built $2M ARR at Flint...\n• Drove $30M pipeline at Samsung...\n\n**Deep AI/LLM implementation experience**\n• Shipped 3 production AI systems...\n\n**Cross-cultural bridge between US and Korea**\n• Bilingual, led deals across both markets...\"",
  },
];

function SettingsTab({
  answerMode,
  draftPersonas,
  savedPersonas,
  draftLabels,
  savedLabels,
  personasSaving,
  personasSaved,
  saving,
  saved,
  onModeChange,
  onTogglePersona,
  onLabelChange,
  onApplyPersonaSettings,
}: {
  answerMode: string;
  draftPersonas: string[];
  savedPersonas: string[];
  draftLabels: PersonaLabelMap;
  savedLabels: PersonaLabelMap;
  personasSaving: boolean;
  personasSaved: boolean;
  saving: boolean;
  saved: boolean;
  onModeChange: (mode: string) => void;
  onTogglePersona: (value: string) => void;
  onLabelChange: (value: string, lang: "en" | "kr", text: string) => void;
  onApplyPersonaSettings: () => void;
}) {
  const visibilityDirty =
    draftPersonas.length !== savedPersonas.length ||
    [...draftPersonas].sort().join(",") !== [...savedPersonas].sort().join(",");
  const labelsDirty = V14_PERSONA_OPTIONS.some(
    (o) =>
      draftLabels[o.value]?.en !== savedLabels[o.value]?.en ||
      draftLabels[o.value]?.kr !== savedLabels[o.value]?.kr
  );
  const personasDirty = visibilityDirty || labelsDirty;
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Persona Buttons
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Toggle which visitor types appear on the interactive profile (/dj) and
        edit their button labels (English / Korean). Hidden personas can&apos;t
        be selected by visitors; at least one must stay visible. Changes take
        effect when you click Apply.
      </p>

      <div className="flex items-center gap-3 px-1 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
        <span className="w-6 text-center">On</span>
        <span className="w-32 shrink-0">Persona</span>
        <span className="flex-1">English label</span>
        <span className="flex-1">Korean label</span>
      </div>

      <div className="space-y-2 mb-4">
        {V14_PERSONA_OPTIONS.map((opt) => {
          const visible = draftPersonas.includes(opt.value);
          const isLastActive = visible && draftPersonas.length === 1;
          const label = draftLabels[opt.value] ?? { en: opt.en, kr: opt.kr };
          return (
            <div key={opt.value} className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!personasSaving && !isLastActive)
                    onTogglePersona(opt.value);
                }}
                disabled={personasSaving || isLastActive}
                title={
                  visible
                    ? isLastActive
                      ? "At least one persona must stay visible"
                      : "Visible — click to hide"
                    : "Hidden — click to show"
                }
                className={`w-6 h-6 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                  visible
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 bg-white"
                } ${
                  personasSaving || isLastActive
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {visible && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <code
                className="w-32 shrink-0 text-[11px] text-gray-400 truncate"
                title={opt.value}
              >
                {opt.value}
              </code>
              <input
                type="text"
                value={label.en}
                onChange={(e) => onLabelChange(opt.value, "en", e.target.value)}
                disabled={personasSaving}
                placeholder={opt.en}
                className={`flex-1 min-w-0 px-2.5 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                  visible ? "border-gray-300" : "border-gray-200 text-gray-400"
                }`}
              />
              <input
                type="text"
                value={label.kr}
                onChange={(e) => onLabelChange(opt.value, "kr", e.target.value)}
                disabled={personasSaving}
                placeholder={opt.kr}
                className={`flex-1 min-w-0 px-2.5 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                  visible ? "border-gray-300" : "border-gray-200 text-gray-400"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Apply — persona changes only take effect when this is clicked */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            if (personasDirty && !personasSaving) onApplyPersonaSettings();
          }}
          disabled={!personasDirty || personasSaving}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            personasDirty && !personasSaving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {personasSaving ? "Applying..." : "Apply"}
        </button>
        {personasDirty && !personasSaving && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
        {personasSaved && !personasDirty && (
          <span className="text-sm text-green-600">
            Applied — live on the profile
          </span>
        )}
      </div>

      <div className="border-t border-gray-200 my-8" />

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Answer Mode
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Controls how the RAG system structures its responses. Applies to all
        chat endpoints (main app + UI prototypes).
      </p>

      <div className="space-y-3">
        {MODES.map((mode) => {
          const active = answerMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                if (!active && !saving) onModeChange(mode.id);
              }}
              disabled={saving}
              className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                active
                  ? "border-blue-500 bg-blue-50/50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      active ? "border-blue-500" : "border-gray-300"
                    }`}
                  >
                    {active && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {mode.label}
                  </span>
                </div>
                {active && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 ml-6.5 mb-3 ml-[26px]">
                {mode.description}
              </p>
              <div className="ml-[26px] bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                  Example output
                </p>
                <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed font-mono">
                  {mode.example}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status indicator */}
      <div className="mt-4 h-6 flex items-center">
        {saving && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saved && (
          <span className="text-sm text-green-600">
            Saved — new conversations will use this mode
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────

function SummaryCard({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    gray: "text-gray-900",
    green: "text-green-700",
    orange: "text-orange-600",
    blue: "text-blue-700",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${colors[color] ?? colors.gray}`}>
        {value}
      </p>
    </div>
  );
}

function DistributionCard({
  title,
  data,
  labels,
  color = "blue",
}: {
  title: string;
  data: Record<string, number>;
  labels?: Record<string, string>;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-400",
    purple: "bg-purple-400",
    green: "bg-green-400",
    indigo: "bg-indigo-400",
  };
  const barColor = colorMap[color] ?? colorMap.blue;
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data)
          .sort(([, a], [, b]) => b - a)
          .map(([key, count]) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>{labels?.[key] ?? key}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
