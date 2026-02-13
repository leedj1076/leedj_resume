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
    .select("persona, focus, lang, dj_rating, reviewed_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = data ?? [];
  const total = rows.length;
  const reviewed = rows.filter((r) => r.reviewed_at).length;
  const unreviewed = total - reviewed;

  // Persona distribution
  const personaCounts: Record<string, number> = {};
  for (const r of rows) {
    personaCounts[r.persona] = (personaCounts[r.persona] || 0) + 1;
  }

  // Focus distribution
  const focusCounts: Record<string, number> = {};
  for (const r of rows) {
    focusCounts[r.focus] = (focusCounts[r.focus] || 0) + 1;
  }

  // Rating distribution
  const ratingCounts: Record<string, number> = { good: 0, needs_improvement: 0, unrated: 0 };
  for (const r of rows) {
    if (r.dj_rating === "good") ratingCounts.good++;
    else if (r.dj_rating === "needs_improvement") ratingCounts.needs_improvement++;
    else ratingCounts.unrated++;
  }

  // Language distribution
  const langCounts: Record<string, number> = {};
  for (const r of rows) {
    const l = r.lang || "en";
    langCounts[l] = (langCounts[l] || 0) + 1;
  }

  // Daily volume (last 14 days)
  const dailyVolume: Record<string, number> = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyVolume[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of rows) {
    const day = r.created_at?.slice(0, 10);
    if (day && day in dailyVolume) {
      dailyVolume[day]++;
    }
  }

  return new Response(
    JSON.stringify({
      total,
      reviewed,
      unreviewed,
      personaCounts,
      focusCounts,
      ratingCounts,
      langCounts,
      dailyVolume,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
