import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { password, page = 1, filter = "all", persona } = body;

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
