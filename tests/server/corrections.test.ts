import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createAdminToken } from "@/lib/server/admin-auth";
import { POST } from "@/app/api/admin/review/route";
import { embed } from "ai";

type Row = Record<string, unknown>;
type Vector = { id: string; values: number[]; metadata: Record<string, unknown> };
const state = vi.hoisted(() => ({
  rows: new Map<number, Row>(),
  writes: [] as Vector[],
  embeddingFails: false,
  upsertFails: false,
  acknowledgementFails: false,
  reviewWriteFails: false,
  databaseWrites: 0,
  statusAtVectorWrite: [] as unknown[],
}));

vi.mock("@/lib/supabase", () => {
  const client = {
    from(table: string) {
      if (table !== "chat_exchanges") throw new Error(`Unexpected table ${table}`);
      let patch: Row | null = null;
      let id: number | null = null;
      return {
        select() { return this; },
        update(value: Row) { patch = value; return this; },
        eq(column: string, value: number) {
          if (column !== "id") throw new Error(`Unexpected column ${column}`);
          id = value;
          return this;
        },
        async maybeSingle() { return read(); },
        async single() { return read(); },
        then(resolve: (result: unknown) => unknown) { return Promise.resolve(resolve(read())); },
      };
      function read() {
        const row = id === null ? null : state.rows.get(id) ?? null;
        if (!patch) return { data: row, error: null };
        if (!row) return { data: null, error: { code: "PGRST116", message: "No exchange" } };
        state.databaseWrites++;
        if (state.reviewWriteFails && patch.dj_rating) {
          return { data: null, error: { message: "review write rejected" } };
        }
        if (state.acknowledgementFails && patch.correction_status === "applied") {
          return { data: null, error: { message: "acknowledgement lost" } };
        }
        const updated = { ...row, ...patch };
        state.rows.set(id!, updated);
        return { data: updated, error: null };
      }
    },
  };
  return { supabase: client, getSupabaseClient: () => client };
});
vi.mock("ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("ai")>(),
  embed: vi.fn(),
}));
vi.mock("@/lib/pinecone", () => ({
  getResumeIndex: () => ({ namespace(name: string) {
    if (name !== "resume") throw new Error(`Unexpected namespace ${name}`);
    return { async upsert({ records }: { records: Vector[] }) {
      state.statusAtVectorWrite.push(state.rows.get(42)?.correction_status);
      state.writes.push(...records);
      if (state.upsertFails) throw new Error("index unavailable");
    } };
  } }),
}));

const originalPassword = process.env.ADMIN_PASSWORD;
const originalSecret = process.env.ADMIN_SESSION_SECRET;

function exchange(id: number): Row {
  return {
    id, created_at: "2026-09-20T00:00:00.000Z", session_id: "s1", persona: "founder",
    focus: "general", lang: "en", query: "How does DJ lead teams?", response: "Original answer",
    chunks_used: [], visitor_email: null, source: null, dj_rating: null, dj_comment: null,
    improvement_text: null, pinecone_chunk_id: null, reviewed_at: null,
    correction_status: "none", correction_error: null,
  };
}

async function submit(body: unknown) {
  const token = await createAdminToken("review-secret", Date.now());
  const response = await POST(new Request("https://example.test/api/admin/review", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json", cookie: `ask_dj_admin=${token}` },
    body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "review-password";
  process.env.ADMIN_SESSION_SECRET = "review-secret";
  state.rows.clear();
  state.writes = [];
  state.embeddingFails = false;
  state.upsertFails = false;
  state.acknowledgementFails = false;
  state.reviewWriteFails = false;
  state.databaseWrites = 0;
  state.statusAtVectorWrite = [];
  vi.mocked(embed).mockImplementation(async () => {
    if (state.embeddingFails) throw new Error("embedding unavailable");
    return { embedding: [0.25, 0.75] } as Awaited<ReturnType<typeof embed>>;
  });
});

afterEach(() => {
  process.env.ADMIN_PASSWORD = originalPassword;
  process.env.ADMIN_SESSION_SECRET = originalSecret;
});

describe("admin correction synchronization", () => {
  it("rejects invalid input before database or vector side effects", async () => {
    state.rows.set(42, exchange(42));
    const result = await submit({ exchangeId: 42, rating: "bad", improvementText: "Correction" });
    expect(result.status).toBe(400);
    expect(state.databaseWrites).toBe(0);
    expect(state.writes).toEqual([]);
  });

  it("rejects a missing exchange instead of reporting a saved review", async () => {
    const result = await submit({ exchangeId: 404, rating: "needs_improvement", improvementText: "Correction" });
    expect(result.status).toBe(404);
    expect(state.databaseWrites).toBe(0);
    expect(state.writes).toEqual([]);
  });

  it("does not index or report a partial correction when the review write fails", async () => {
    state.rows.set(42, exchange(42));
    state.reviewWriteFails = true;
    const result = await submit({ exchangeId: 42, rating: "needs_improvement", improvementText: "Correct answer" });
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ code: "internal_error" });
    expect(state.rows.get(42)).toMatchObject({ dj_rating: null, improvement_text: null, correction_status: "none" });
    expect(state.writes).toEqual([]);
  });

  it("applies repeated corrections to only the stable exchange vector ID", async () => {
    state.rows.set(42, exchange(42));
    const input = { exchangeId: 42, rating: "needs_improvement", improvementText: "Correct answer" };
    expect(await submit(input)).toEqual({ status: 200, body: { success: true, pineconeChunkId: "dj-correction-42", correctionStatus: "applied" } });
    expect(await submit({ ...input, improvementText: "  Updated answer  " })).toEqual({ status: 200, body: { success: true, pineconeChunkId: "dj-correction-42", correctionStatus: "applied" } });
    expect(new Set(state.writes.map((record) => record.id))).toEqual(new Set(["dj-correction-42"]));
    expect(state.statusAtVectorWrite).toEqual(["pending", "pending"]);
    expect(state.writes.at(-1)?.metadata.enrichedText).toBe("  Updated answer  ");
    expect(state.rows.get(42)).toMatchObject({ improvement_text: "  Updated answer  ", correction_status: "applied", pinecone_chunk_id: "dj-correction-42" });
  });

  it.each(["embeddingFails", "upsertFails"] as const)("keeps correction retryable when %s", async (failure) => {
    state.rows.set(42, exchange(42));
    state[failure] = true;
    const failedResult = await submit({ exchangeId: 42, rating: "needs_improvement", comment: "Review note", improvementText: "Correct answer" });
    expect(failedResult.status).toBe(502);
    expect(failedResult.body).toMatchObject({ success: false, pineconeChunkId: null, correctionStatus: "failed" });
    expect(failedResult.body.correctionError).toEqual(expect.any(String));
    expect(state.rows.get(42)).toMatchObject({ dj_rating: "needs_improvement", dj_comment: "Review note", improvement_text: "Correct answer", correction_status: "failed", pinecone_chunk_id: null });
    expect(state.rows.get(42)?.correction_error).toEqual(expect.any(String));
    state[failure] = false;
    const retried = await submit({ exchangeId: 42, rating: "needs_improvement" });
    expect(retried.body).toMatchObject({ success: true, pineconeChunkId: "dj-correction-42", correctionStatus: "applied" });
    expect(new Set(state.writes.map((record) => record.id))).toEqual(new Set(["dj-correction-42"]));
    expect(state.rows.get(42)).toMatchObject({ improvement_text: "Correct answer", correction_status: "applied", correction_error: null });
  });

  it("reports acknowledgement loss as failure and retries the same vector", async () => {
    state.rows.set(42, exchange(42));
    state.acknowledgementFails = true;
    const failedResult = await submit({ exchangeId: 42, rating: "needs_improvement", improvementText: "Correct answer" });
    expect(failedResult.status).toBe(502);
    expect(failedResult.body).toMatchObject({ success: false, correctionStatus: "failed", pineconeChunkId: null });
    expect(state.rows.get(42)).toMatchObject({ correction_status: "failed", improvement_text: "Correct answer" });
    state.acknowledgementFails = false;
    expect((await submit({ exchangeId: 42, rating: "needs_improvement" })).body).toMatchObject({ success: true, correctionStatus: "applied" });
    expect(new Set(state.writes.map((record) => record.id))).toEqual(new Set(["dj-correction-42"]));
  });

  it("retains an applied correction on a rating-only update", async () => {
    state.rows.set(42, { ...exchange(42), improvement_text: "Earlier correction", correction_status: "applied", pinecone_chunk_id: "dj-correction-42" });
    const result = await submit({ exchangeId: 42, rating: "good" });
    expect(result.body).toMatchObject({ success: true, correctionStatus: "applied", pineconeChunkId: "dj-correction-42" });
    expect(state.rows.get(42)).toMatchObject({ dj_rating: "good", improvement_text: "Earlier correction", correction_status: "applied", pinecone_chunk_id: "dj-correction-42" });
    expect(state.writes).toEqual([]);
  });
});
