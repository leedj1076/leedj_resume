import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { password, page = 1, filter = "all", persona, view } = body;

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

  // ── Session-grouped view ──────────────────────────────────
  if (view === "sessions") {
    let query = supabase
      .from("chat_exchanges")
      .select("*")
      .order("created_at", { ascending: true });

    if (filter === "unreviewed") {
      query = query.is("reviewed_at", null);
    } else if (filter === "reviewed") {
      query = query.not("reviewed_at", "is", null);
    } else if (filter === "good") {
      query = query.eq("dj_rating", "good");
    } else if (filter === "needs_improvement") {
      query = query.eq("dj_rating", "needs_improvement");
    }
    if (persona) {
      query = query.eq("persona", persona);
    }

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Group by session_id
    const sessionMap = new Map<string, typeof data>();
    for (const row of data ?? []) {
      const sid = row.session_id || "unknown";
      if (!sessionMap.has(sid)) sessionMap.set(sid, []);
      sessionMap.get(sid)!.push(row);
    }

    // Sort sessions by most recent exchange (descending)
    const sorted = [...sessionMap.entries()].sort((a, b) => {
      const aLast = a[1][a[1].length - 1].created_at;
      const bLast = b[1][b[1].length - 1].created_at;
      return bLast.localeCompare(aLast);
    });

    // Paginate sessions (10 per page)
    const sessionsPerPage = 10;
    const totalSessions = sorted.length;
    const offset = (page - 1) * sessionsPerPage;
    const pageEntries = sorted.slice(offset, offset + sessionsPerPage);

    const sessions = pageEntries.map(([sid, exs]) => ({
      session_id: sid,
      persona: exs[0].persona,
      focus: exs[0].focus,
      lang: exs[0].lang,
      started_at: exs[0].created_at,
      visitor_email: exs.find((e) => e.visitor_email)?.visitor_email ?? null,
      exchanges: exs, // chronological
    }));

    return new Response(
      JSON.stringify({ sessions, totalSessions, page, pageSize: sessionsPerPage }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Default flat view ─────────────────────────────────────
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("chat_exchanges")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filter === "unreviewed") {
    query = query.is("reviewed_at", null);
  } else if (filter === "reviewed") {
    query = query.not("reviewed_at", "is", null);
  } else if (filter === "good") {
    query = query.eq("dj_rating", "good");
  } else if (filter === "needs_improvement") {
    query = query.eq("dj_rating", "needs_improvement");
  }

  if (persona) {
    query = query.eq("persona", persona);
  }

  const { data, count, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ exchanges: data, total: count, page, pageSize }),
    { headers: { "Content-Type": "application/json" } }
  );
}
