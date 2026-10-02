import "server-only";
import { getSupabaseClient } from "../supabase";
import { HttpError } from "./http";
import { exchangeSchema, type Exchange } from "../domain/admin";

export function requireDatabase() {
  const client = getSupabaseClient();
  if (!client)
    throw new HttpError(503, "storage_unavailable", "Database not configured");
  return client;
}

export async function fetchAllExchanges(): Promise<Exchange[]> {
  const client = requireDatabase();
  const rows: Exchange[] = [];
  let lastId = 0;
  for (;;) {
    const { data, error } = await client
      .from("chat_exchanges")
      .select("*")
      .gt("id", lastId)
      .order("id", { ascending: true })
      .range(0, 499);
    if (error) throw new Error(`Database read failed: ${error.message}`);
    if (!data) throw new Error("Database read returned no data");
    const page = data.map((row) => exchangeSchema.parse(row));
    rows.push(...page);
    if (page.length) lastId = page.at(-1)!.id;
    if (data.length < 500) break;
  }
  // Consumer session ordering is chronological, independent of identity allocation.
  return rows.sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id,
  );
}
