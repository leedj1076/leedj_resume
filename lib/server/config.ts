import "#server-only";

export function getPineconeIndexName(): string {
  const name = process.env.PINECONE_INDEX_NAME;
  if (!name) throw new Error("PINECONE_INDEX_NAME is not configured");
  return name;
}

export function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}
