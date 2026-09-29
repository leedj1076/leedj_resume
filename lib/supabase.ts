import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseCredentials } from "./server/config";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const credentials = getSupabaseCredentials();
  if (!credentials) return null;
  if (!client) client = createClient(credentials.url, credentials.key);
  return client;
}

// Compatibility value for existing consumers; construct the client on first use.
export const supabase: SupabaseClient | null = getSupabaseCredentials()
  ? new Proxy({} as SupabaseClient, {
      get(_target, property) {
        const instance = getSupabaseClient();
        if (!instance) return undefined;
        const value = Reflect.get(instance, property);
        return typeof value === "function" ? value.bind(instance) : value;
      },
    })
  : null;
