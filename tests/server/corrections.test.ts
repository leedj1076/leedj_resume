import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createAdminToken } from "@/lib/server/admin-auth";
import { POST } from "@/app/api/admin/review/route";
import { embed } from "ai";

type Row = Record<string, unknown>;
type Vector = {
  id: string;
  values: number[];
  metadata: Record<string, unknown>;
};
const state = vi.hoisted(() => ({
  rows: new Map<number, Row>(),
  writes: [] as Vector[],
  indexedVectors: new Map<string, Vector>(),
  lateProviderWrite: null as null | (() => void),
  embeddingFails: false,
  upsertFails: false,
  acknowledgementFails: false,
  reviewWriteFails: false,
  failureRecordFails: false,
  releaseFails: false,
  databaseWrites: 0,
  statusAtVectorWrite: [] as unknown[],
  holdFirstEmbed: false,
  failFirstEmbed: false,
  embedCount: 0,
  releaseFirstEmbed: null as null | (() => void),
}));

vi.mock("@/lib/supabase", () => {
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      const id = Number(args.p_exchange_id);
      const row = state.rows.get(id);
      if (name === "claim_correction_review") {
        if (!row || row.correction_owner_token)
          return { data: null, error: null };
        if (state.reviewWriteFails)
          return { data: null, error: { message: "review write rejected" } };
        const supplied =
          typeof args.p_improvement_text === "string" &&
          args.p_improvement_text.trim()
            ? args.p_improvement_text
            : null;
        const retry =
          (row.correction_status === "failed" ||
            row.correction_status === "pending") &&
          row.improvement_text;
        const pending = Boolean(supplied || retry);
        const updated = {
          ...row,
          correction_owner_token: args.p_owner_token,
          correction_claimed_at: "2026-09-30T00:00:00.000Z",
          dj_rating: args.p_rating,
          dj_comment: args.p_comment || null,
          reviewed_at: args.p_reviewed_at,
          improvement_text: supplied || row.improvement_text,
          correction_status: pending ? "pending" : row.correction_status,
          correction_error: pending ? null : row.correction_error,
          pinecone_chunk_id: pending ? null : row.pinecone_chunk_id,
        };
        state.databaseWrites++;
        state.rows.set(id, updated);
        return { data: updated, error: null };
      }
      if (name === "finish_correction_review") {
        if (!row || row.correction_owner_token !== args.p_owner_token)
          return { data: null, error: null };
        if (state.acknowledgementFails && args.p_status === "applied")
          return { data: null, error: { message: "acknowledgement lost" } };
        if (state.failureRecordFails && args.p_status === "failed")
          return {
            data: null,
            error: { message: "failure record unavailable" },
          };
        if (state.releaseFails && args.p_status === null)
          return {
            data: null,
            error: { message: "claim release unavailable" },
          };
        const updated = {
          ...row,
          correction_owner_token: null,
          correction_claimed_at: null,
          correction_status: args.p_status ?? row.correction_status,
          correction_error:
            args.p_status === "applied"
              ? null
              : args.p_status === "failed"
                ? args.p_error
                : row.correction_error,
          pinecone_chunk_id:
            args.p_status === "applied"
              ? args.p_chunk_id
              : row.pinecone_chunk_id,
        };
        state.databaseWrites++;
        state.rows.set(id, updated);
        return { data: updated, error: null };
      }
      if (name === "record_uncertain_correction_review") {
        if (!row || row.correction_owner_token !== args.p_owner_token)
          return { data: null, error: null };
        if (state.failureRecordFails)
          return {
            data: null,
            error: { message: "failure record unavailable" },
          };
        const updated = {
          ...row,
          correction_status: "failed",
          correction_error: args.p_error,
        };
        state.databaseWrites++;
        state.rows.set(id, updated);
        return { data: updated, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
    from(table: string) {
      if (table !== "chat_exchanges")
        throw new Error(`Unexpected table ${table}`);
      let patch: Row | null = null;
      let id: number | null = null;
      return {
        select() {
          return this;
        },
        update(value: Row) {
          patch = value;
          return this;
        },
        eq(column: string, value: number) {
          if (column !== "id") throw new Error(`Unexpected column ${column}`);
          id = value;
          return this;
        },
        async maybeSingle() {
          return read();
        },
        async single() {
          return read();
        },
        then(resolve: (result: unknown) => unknown) {
          return Promise.resolve(resolve(read()));
        },
      };
      function read() {
        const row = id === null ? null : (state.rows.get(id) ?? null);
        if (!patch) return { data: row, error: null };
        if (!row)
          return {
            data: null,
            error: { code: "PGRST116", message: "No exchange" },
          };
        state.databaseWrites++;
        if (state.reviewWriteFails && patch.dj_rating) {
          return { data: null, error: { message: "review write rejected" } };
        }
        if (
          state.acknowledgementFails &&
          patch.correction_status === "applied"
        ) {
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
  ...(await importOriginal<typeof import("ai")>()),
  embed: vi.fn(),
}));
vi.mock("@/lib/pinecone", () => ({
  getResumeIndex: () => ({
    namespace(name: string) {
      if (name !== "resume") throw new Error(`Unexpected namespace ${name}`);
      return {
        async upsert({ records }: { records: Vector[] }) {
          state.statusAtVectorWrite.push(state.rows.get(42)?.correction_status);
          const write = () => {
            state.writes.push(...records);
            for (const record of records)
              state.indexedVectors.set(record.id, record);
          };
          if (state.upsertFails) {
            state.lateProviderWrite = write;
            throw new Error("index acknowledgement unavailable");
          }
          write();
        },
      };
    },
  }),
}));

const originalPassword = process.env.ADMIN_PASSWORD;
const originalSecret = process.env.ADMIN_SESSION_SECRET;

function exchange(id: number): Row {
  return {
    id,
    created_at: "2026-09-20T00:00:00.000Z",
    session_id: "s1",
    persona: "founder",
    focus: "general",
    lang: "en",
    query: "How does DJ lead teams?",
    response: "Original answer",
    chunks_used: [],
    visitor_email: null,
    source: null,
    dj_rating: null,
    dj_comment: null,
    improvement_text: null,
    pinecone_chunk_id: null,
    reviewed_at: null,
    correction_status: "none",
    correction_error: null,
    correction_owner_token: null,
    correction_claimed_at: null,
  };
}

async function submit(body: unknown) {
  const token = await createAdminToken("review-secret", Date.now());
  const response = await POST(
    new Request("https://example.test/api/admin/review", {
      method: "POST",
      headers: {
        origin: "https://example.test",
        "content-type": "application/json",
        cookie: `ask_dj_admin=${token}`,
      },
      body: JSON.stringify(body),
    }),
  );
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "review-password";
  process.env.ADMIN_SESSION_SECRET = "review-secret";
  state.rows.clear();
  state.writes = [];
  state.indexedVectors.clear();
  state.lateProviderWrite = null;
  state.embeddingFails = false;
  state.upsertFails = false;
  state.acknowledgementFails = false;
  state.reviewWriteFails = false;
  state.failureRecordFails = false;
  state.releaseFails = false;
  state.databaseWrites = 0;
  state.statusAtVectorWrite = [];
  state.holdFirstEmbed = false;
  state.failFirstEmbed = false;
  state.embedCount = 0;
  state.releaseFirstEmbed = null;
  vi.mocked(embed).mockImplementation(async () => {
    const call = ++state.embedCount;
    if (call === 1 && state.holdFirstEmbed) {
      await new Promise<void>((resolve) => {
        state.releaseFirstEmbed = resolve;
      });
    }
    if (call === 1 && state.failFirstEmbed)
      throw new Error("first embedding unavailable");
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
    const result = await submit({
      exchangeId: 42,
      rating: "bad",
      improvementText: "Correction",
    });
    expect(result.status).toBe(400);
    expect(state.databaseWrites).toBe(0);
    expect(state.writes).toEqual([]);
  });

  it("rejects a missing exchange instead of reporting a saved review", async () => {
    const result = await submit({
      exchangeId: 404,
      rating: "needs_improvement",
      improvementText: "Correction",
    });
    expect(result.status).toBe(404);
    expect(state.databaseWrites).toBe(0);
    expect(state.writes).toEqual([]);
  });

  it("does not index or report a partial correction when the review write fails", async () => {
    state.rows.set(42, exchange(42));
    state.reviewWriteFails = true;
    const result = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "Correct answer",
    });
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ code: "internal_error" });
    expect(state.rows.get(42)).toMatchObject({
      dj_rating: null,
      improvement_text: null,
      correction_status: "none",
    });
    expect(state.writes).toEqual([]);
  });

  it("applies repeated corrections to only the stable exchange vector ID", async () => {
    state.rows.set(42, exchange(42));
    const input = {
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "Correct answer",
    };
    expect(await submit(input)).toEqual({
      status: 200,
      body: {
        success: true,
        pineconeChunkId: "dj-correction-42",
        correctionStatus: "applied",
      },
    });
    expect(
      await submit({ ...input, improvementText: "  Updated answer  " }),
    ).toEqual({
      status: 200,
      body: {
        success: true,
        pineconeChunkId: "dj-correction-42",
        correctionStatus: "applied",
      },
    });
    expect(new Set(state.writes.map((record) => record.id))).toEqual(
      new Set(["dj-correction-42"]),
    );
    expect(state.statusAtVectorWrite).toEqual(["pending", "pending"]);
    expect(state.writes.at(-1)?.metadata.enrichedText).toBe(
      "  Updated answer  ",
    );
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "  Updated answer  ",
      correction_status: "applied",
      pinecone_chunk_id: "dj-correction-42",
    });
  });

  it("retries immediately after embedding fails before any vector write", async () => {
    state.rows.set(42, exchange(42));
    state.embeddingFails = true;
    const failedResult = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
      comment: "Review note",
      improvementText: "Correct answer",
    });
    expect(failedResult.status).toBe(502);
    expect(failedResult.body).toMatchObject({
      success: false,
      pineconeChunkId: null,
      correctionStatus: "failed",
    });
    expect(failedResult.body.correctionError).toEqual(expect.any(String));
    expect(state.rows.get(42)).toMatchObject({
      dj_rating: "needs_improvement",
      dj_comment: "Review note",
      improvement_text: "Correct answer",
      correction_status: "failed",
      pinecone_chunk_id: null,
    });
    expect(state.rows.get(42)?.correction_error).toEqual(expect.any(String));
    state.embeddingFails = false;
    const retried = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
    });
    expect(retried.body).toMatchObject({
      success: true,
      pineconeChunkId: "dj-correction-42",
      correctionStatus: "applied",
    });
    expect(new Set(state.writes.map((record) => record.id))).toEqual(
      new Set(["dj-correction-42"]),
    );
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "Correct answer",
      correction_status: "applied",
      correction_error: null,
    });
  });

  it("holds the claim when a rejected upsert can still write later", async () => {
    state.rows.set(42, exchange(42));
    state.upsertFails = true;
    const rejected = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "First correction",
    });
    expect(rejected.status).toBe(502);
    expect(rejected.body).toMatchObject({
      success: false,
      correctionStatus: "failed",
      pineconeChunkId: null,
    });
    expect(rejected.body.correctionError).toMatch(/administrator/i);
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "First correction",
      correction_status: "failed",
      pinecone_chunk_id: null,
    });
    expect(state.rows.get(42)?.correction_owner_token).toEqual(
      expect.any(String),
    );
    expect(state.writes).toEqual([]);

    state.upsertFails = false;
    expect(
      (
        await submit({
          exchangeId: 42,
          rating: "good",
          improvementText: "Second correction",
        })
      ).status,
    ).toBe(409);
    expect(state.writes).toEqual([]);
    state.lateProviderWrite!();
    expect(
      state.indexedVectors.get("dj-correction-42")?.metadata.enrichedText,
    ).toBe("First correction");
    expect(
      (
        await submit({
          exchangeId: 42,
          rating: "good",
          improvementText: "Second correction",
        })
      ).status,
    ).toBe(409);
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "First correction",
      correction_status: "failed",
    });

    // An administrator verifies the old provider call has ended, then releases its claim.
    state.rows.set(42, {
      ...state.rows.get(42)!,
      correction_owner_token: null,
      correction_claimed_at: null,
    });
    expect(
      (
        await submit({
          exchangeId: 42,
          rating: "good",
          improvementText: "Second correction",
        })
      ).body,
    ).toMatchObject({ success: true, correctionStatus: "applied" });
    expect(
      state.indexedVectors.get("dj-correction-42")?.metadata.enrichedText,
    ).toBe("Second correction");
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "Second correction",
      correction_status: "applied",
    });
  });

  it("reports acknowledgement loss as failure and retries the same vector", async () => {
    state.rows.set(42, exchange(42));
    state.acknowledgementFails = true;
    const failedResult = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "Correct answer",
    });
    expect(failedResult.status).toBe(502);
    expect(failedResult.body).toMatchObject({
      success: false,
      correctionStatus: "failed",
      pineconeChunkId: null,
    });
    expect(state.rows.get(42)).toMatchObject({
      correction_status: "failed",
      improvement_text: "Correct answer",
    });
    state.acknowledgementFails = false;
    expect(
      (await submit({ exchangeId: 42, rating: "needs_improvement" })).body,
    ).toMatchObject({ success: true, correctionStatus: "applied" });
    expect(new Set(state.writes.map((record) => record.id))).toEqual(
      new Set(["dj-correction-42"]),
    );
  });

  it("retains an applied correction on a rating-only update", async () => {
    state.rows.set(42, {
      ...exchange(42),
      improvement_text: "Earlier correction",
      correction_status: "applied",
      pinecone_chunk_id: "dj-correction-42",
    });
    const result = await submit({ exchangeId: 42, rating: "good" });
    expect(result.body).toMatchObject({
      success: true,
      correctionStatus: "applied",
      pineconeChunkId: "dj-correction-42",
    });
    expect(state.rows.get(42)).toMatchObject({
      dj_rating: "good",
      improvement_text: "Earlier correction",
      correction_status: "applied",
      pinecone_chunk_id: "dj-correction-42",
    });
    expect(state.writes).toEqual([]);
  });

  it("rejects an overlapping review before mutation and accepts it after the first correction completes", async () => {
    state.rows.set(42, exchange(42));
    state.holdFirstEmbed = true;
    const first = submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "First correction",
    });
    await vi.waitFor(() =>
      expect(state.releaseFirstEmbed).toBeTypeOf("function"),
    );
    const overlap = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "Second correction",
    });
    expect(overlap.status).toBe(409);
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "First correction",
      correction_status: "pending",
    });
    expect(state.writes).toEqual([]);
    state.releaseFirstEmbed!();
    expect((await first).body).toMatchObject({
      success: true,
      correctionStatus: "applied",
    });
    expect(
      (
        await submit({
          exchangeId: 42,
          rating: "needs_improvement",
          improvementText: "Second correction",
        })
      ).body,
    ).toMatchObject({ success: true, correctionStatus: "applied" });
    expect(state.rows.get(42)).toMatchObject({
      improvement_text: "Second correction",
      correction_status: "applied",
    });
    expect(state.writes.map((record) => record.id)).toEqual([
      "dj-correction-42",
      "dj-correction-42",
    ]);
    expect(state.writes.at(-1)?.metadata.enrichedText).toBe(
      "Second correction",
    );
  });

  it("releases a failed correction claim so a newer review can retry safely", async () => {
    state.rows.set(42, exchange(42));
    state.holdFirstEmbed = true;
    state.failFirstEmbed = true;
    const first = submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "First correction",
    });
    await vi.waitFor(() =>
      expect(state.releaseFirstEmbed).toBeTypeOf("function"),
    );
    expect(
      (
        await submit({
          exchangeId: 42,
          rating: "good",
          improvementText: "Second correction",
        })
      ).status,
    ).toBe(409);
    state.releaseFirstEmbed!();
    expect((await first).body).toMatchObject({
      success: false,
      correctionStatus: "failed",
    });
    expect(
      (
        await submit({
          exchangeId: 42,
          rating: "good",
          improvementText: "Second correction",
        })
      ).body,
    ).toMatchObject({ success: true, correctionStatus: "applied" });
    expect(state.rows.get(42)).toMatchObject({
      dj_rating: "good",
      improvement_text: "Second correction",
      correction_status: "applied",
    });
    expect(state.writes.map((record) => record.id)).toEqual([
      "dj-correction-42",
    ]);
  });

  it("keeps the pending claim when failure recording is unavailable", async () => {
    state.rows.set(42, exchange(42));
    state.embeddingFails = true;
    state.failureRecordFails = true;
    const result = await submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "Correct answer",
    });
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({
      success: false,
      correctionStatus: "failed",
      pineconeChunkId: null,
    });
    expect(result.body.correctionError).toMatch(/administrator/i);
    expect(state.rows.get(42)).toMatchObject({
      correction_status: "pending",
      improvement_text: "Correct answer",
    });
    expect(state.rows.get(42)?.correction_owner_token).toEqual(
      expect.any(String),
    );
    expect((await submit({ exchangeId: 42, rating: "good" })).status).toBe(409);
  });

  it("reports an unconfirmed rating-only release without clearing its claim", async () => {
    state.rows.set(42, exchange(42));
    state.releaseFails = true;
    const result = await submit({ exchangeId: 42, rating: "good" });
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({
      success: false,
      correctionStatus: "failed",
      pineconeChunkId: null,
    });
    expect(result.body.correctionError).toMatch(/administrator/i);
    expect(state.rows.get(42)).toMatchObject({
      dj_rating: "good",
      correction_status: "none",
    });
    expect(state.rows.get(42)?.correction_owner_token).toEqual(
      expect.any(String),
    );
    expect(state.writes).toEqual([]);
  });

  it("does not finalize or release a claim whose owner token has changed", async () => {
    state.rows.set(42, exchange(42));
    state.holdFirstEmbed = true;
    const first = submit({
      exchangeId: 42,
      rating: "needs_improvement",
      improvementText: "First correction",
    });
    await vi.waitFor(() =>
      expect(state.releaseFirstEmbed).toBeTypeOf("function"),
    );
    state.rows.set(42, {
      ...state.rows.get(42)!,
      correction_owner_token: "replacement-owner",
    });
    state.releaseFirstEmbed!();
    expect((await first).body).toMatchObject({
      success: false,
      correctionStatus: "failed",
      pineconeChunkId: null,
    });
    expect(state.rows.get(42)).toMatchObject({
      correction_status: "pending",
      correction_owner_token: "replacement-owner",
    });
  });
});
