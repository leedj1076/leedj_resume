import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { password } = body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch all exchanges for aggregation
  const { data, error } = await supabase
    .from("chat_exchanges")
    .select("session_id, persona, focus, lang, dj_rating, reviewed_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = data ?? [];
  const totalExchanges = rows.length;
  const reviewed = rows.filter((r) => r.reviewed_at).length;
  const unreviewed = totalExchanges - reviewed;

  // Group by session_id
  const sessions = new Map<string, typeof rows>();
  for (const r of rows) {
    const sid = r.session_id || "unknown";
    if (!sessions.has(sid)) sessions.set(sid, []);
    sessions.get(sid)!.push(r);
  }
  const totalSessions = sessions.size;
  const avgExchangesPerSession = totalSessions > 0
    ? Math.round((totalExchanges / totalSessions) * 10) / 10
    : 0;

  // Persona distribution (by session — use first exchange's value)
  const personaCounts: Record<string, number> = {};
  for (const [, exs] of sessions) {
    const p = exs[exs.length - 1].persona; // earliest (rows are desc)
    personaCounts[p] = (personaCounts[p] || 0) + 1;
  }

  // Focus distribution (by session)
  const focusCounts: Record<string, number> = {};
  for (const [, exs] of sessions) {
    const f = exs[exs.length - 1].focus;
    focusCounts[f] = (focusCounts[f] || 0) + 1;
  }

  // Rating distribution (stays exchange-level)
  const ratingCounts: Record<string, number> = { good: 0, needs_improvement: 0, unrated: 0 };
  for (const r of rows) {
    if (r.dj_rating === "good") ratingCounts.good++;
    else if (r.dj_rating === "needs_improvement") ratingCounts.needs_improvement++;
    else ratingCounts.unrated++;
  }

  // Language distribution (by session)
  const langCounts: Record<string, number> = {};
  for (const [, exs] of sessions) {
    const l = exs[exs.length - 1].lang || "en";
    langCounts[l] = (langCounts[l] || 0) + 1;
  }

  // Daily volume (last 14 days)
  const dailySessions: Record<string, number> = {};
  const dailyExchanges: Record<string, number> = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailySessions[key] = 0;
    dailyExchanges[key] = 0;
  }
  // Count exchanges per day
  for (const r of rows) {
    const day = r.created_at?.slice(0, 10);
    if (day && day in dailyExchanges) {
      dailyExchanges[day]++;
    }
  }
  // Count unique sessions per day (use earliest created_at per session)
  for (const [, exs] of sessions) {
    const earliest = exs[exs.length - 1].created_at?.slice(0, 10);
    if (earliest && earliest in dailySessions) {
      dailySessions[earliest]++;
    }
  }

  return new Response(
    JSON.stringify({
      totalSessions,
      totalExchanges,
      avgExchangesPerSession,
      reviewed,
      unreviewed,
      personaCounts,
      focusCounts,
      ratingCounts,
      langCounts,
      dailySessions,
      dailyExchanges,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
