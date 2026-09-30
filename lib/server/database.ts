import "server-only";
import { getSupabaseClient } from "../supabase";
import { HttpError } from "./http";
import { exchangeSchema, type Exchange } from "../domain/admin";

export function requireDatabase() {
  const client = getSupabaseClient();
  if (!client) throw new HttpError(503, "storage_unavailable", "Database not configured");
  return client;
}

export async function fetchAllExchanges(): Promise<Exchange[]> {
  const client = requireDatabase();
  const rows: Exchange[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("chat_exchanges").select("*")
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(offset, offset + 499);
    if (error) throw new Error(`Database read failed: ${error.message}`);
    if (!data) throw new Error("Database read returned no data");
    rows.push(...data.map((row) => exchangeSchema.parse(row)));
    if (data.length < 500) break;
  }
  return rows;
}
