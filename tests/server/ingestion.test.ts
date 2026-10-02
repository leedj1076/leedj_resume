import { describe, expect, it } from "vitest";
import resume from "@/data/resume.json";
import { syncKnowledge, type IngestionGateway } from "@/lib/server/ingestion";
import type { KnowledgeEntry } from "@/lib/domain/knowledge";

const entry = resume[0] as KnowledgeEntry;

function fixture(ids: Array<{ id: string; owner?: string }>, pageSize = 2) {
  const records = new Map(
    ids.map(({ id, owner }) => [id, { source_owner: owner }]),
  );
  const calls = {
    exists: 0,
    pages: 0,
    embeds: 0,
    upserts: [] as string[][],
    deletes: [] as string[][],
    creates: 0,
    fetched: [] as string[][],
  };
  let failPage = false;
  let failFetch = false;
  let failEmbed = false;
  let failUpload = 0;
  const gateway: IngestionGateway = {
    async indexExists() {
      calls.exists++;
      return true;
    },
    async createIndex() {
      calls.creates++;
    },
    async listPage(token) {
      calls.pages++;
      if (failPage) throw new Error("inventory failed");
      const start = token ? Number(token) : 0;
      return {
        ids: ids.slice(start, start + pageSize).map((item) => item.id),
        next:
          start + pageSize < ids.length ? String(start + pageSize) : undefined,
      };
    },
    async fetchMetadata(batch) {
      calls.fetched.push(batch);
      if (failFetch) return {};
      return Object.fromEntries(
        batch
          .filter((id) => records.has(id))
          .map((id) => [id, records.get(id)!]),
      );
    },
    async embed(texts) {
      calls.embeds++;
      if (failEmbed) throw new Error("embedding failed");
      return texts.map(() => Array(3072).fill(0.1));
    },
    async upsert(vectors) {
      calls.upserts.push(vectors.map((vector) => vector.id));
      if (calls.upserts.length === failUpload) throw new Error("upload failed");
    },
    async deleteIds(batch) {
      calls.deletes.push(batch);
    },
  };
  return {
    gateway,
    calls,
    setFailPage: () => {
      failPage = true;
    },
    setFailFetch: () => {
      failFetch = true;
    },
    setFailEmbed: () => {
      failEmbed = true;
    },
    setFailUpload: (n: number) => {
      failUpload = n;
    },
  };
}

describe("knowledge synchronization", () => {
  it("rejects an empty or invalid source before provider access", async () => {
    const fake = fixture([]);
    await expect(
      syncKnowledge([], { dryRun: false }, fake.gateway),
    ).rejects.toThrow(/empty/i);
    await expect(
      syncKnowledge(
        [{ ...entry, chunk_id: "dj-correction-9" }],
        { dryRun: false },
        fake.gateway,
      ),
    ).rejects.toThrow(/reserved/i);
    expect(fake.calls).toMatchObject({
      exists: 0,
      pages: 0,
      embeds: 0,
      upserts: [],
      deletes: [],
      creates: 0,
      fetched: [],
    });
  });

  it("dry run inventories every page and fetches metadata without mutations", async () => {
    const fake = fixture([
      { id: entry.chunk_id, owner: "ask-dj:json:v1" },
      { id: "stale", owner: "ask-dj:json:v1" },
      { id: "dj-correction-4" },
      { id: "legacy" },
      { id: "stale-2", owner: "ask-dj:json:v1" },
    ]);
    const report = await syncKnowledge([entry], { dryRun: true }, fake.gateway);
    expect(report.plan).toMatchObject({
      updateIds: [entry.chunk_id],
      deleteIds: ["stale", "stale-2"],
      preservedIds: ["dj-correction-4", "legacy"],
    });
    expect(fake.calls.fetched).toEqual([
      [entry.chunk_id, "stale", "dj-correction-4", "legacy", "stale-2"],
    ]);
    expect(fake.calls).toMatchObject({
      embeds: 0,
      upserts: [],
      deletes: [],
      creates: 0,
    });
  });

  it("does not prune after inventory or embedding failure", async () => {
    const fake = fixture([{ id: "stale", owner: "ask-dj:json:v1" }]);
    fake.setFailPage();
    await expect(
      syncKnowledge([entry], { dryRun: false }, fake.gateway),
    ).rejects.toThrow("inventory failed");
    expect(fake.calls.deletes).toEqual([]);
    const missing = fixture([{ id: "stale", owner: "ask-dj:json:v1" }]);
    missing.setFailFetch();
    await expect(
      syncKnowledge([entry], { dryRun: false }, missing.gateway),
    ).rejects.toThrow(/incomplete/i);
    expect(missing.calls).toMatchObject({
      embeds: 0,
      upserts: [],
      deletes: [],
    });
    const embedding = fixture([{ id: "stale", owner: "ask-dj:json:v1" }]);
    embedding.setFailEmbed();
    await expect(
      syncKnowledge([entry], { dryRun: false }, embedding.gateway),
    ).rejects.toThrow("embedding failed");
    expect(embedding.calls).toMatchObject({ upserts: [], deletes: [] });
  });

  it("upserts 101 records in batches before pruning, then safely reruns", async () => {
    const entries = Array.from({ length: 101 }, (_, n) => ({
      ...entry,
      chunk_id: `record-${n}`,
    }));
    const fake = fixture([{ id: "stale", owner: "ask-dj:json:v1" }]);
    const report = await syncKnowledge(
      entries,
      { dryRun: false },
      fake.gateway,
    );
    expect(fake.calls.upserts.map((batch) => batch.length)).toEqual([100, 1]);
    expect(fake.calls.deletes).toEqual([["stale"]]);
    expect(report.upsertedCount).toBe(101);
    const rerun = fixture(
      entries.map((item) => ({ id: item.chunk_id, owner: "ask-dj:json:v1" })),
    );
    const next = await syncKnowledge(entries, { dryRun: false }, rerun.gateway);
    expect(next.plan.deleteIds).toEqual([]);
    expect(rerun.calls.fetched.map((batch) => batch.length)).toEqual([100, 1]);
    expect(rerun.calls.deletes).toEqual([]);
  });

  it("prepares a complete plan before creating a fresh index", async () => {
    const fake = fixture([]);
    fake.gateway.indexExists = async () => false;
    const dry = await syncKnowledge([entry], { dryRun: true }, fake.gateway);
    expect(dry.indexWouldBeCreated).toBe(true);
    expect(fake.calls).toMatchObject({
      embeds: 0,
      creates: 0,
      upserts: [],
      deletes: [],
    });
    await syncKnowledge([entry], { dryRun: false }, fake.gateway);
    expect(fake.calls).toMatchObject({ embeds: 1, creates: 1, deletes: [] });
  });

  it("never prunes if the second upload fails", async () => {
    const entries = Array.from({ length: 101 }, (_, n) => ({
      ...entry,
      chunk_id: `record-${n}`,
    }));
    const fake = fixture([{ id: "stale", owner: "ask-dj:json:v1" }]);
    fake.setFailUpload(2);
    await expect(
      syncKnowledge(entries, { dryRun: false }, fake.gateway),
    ).rejects.toThrow("upload failed");
    expect(fake.calls.upserts.map((batch) => batch.length)).toEqual([100, 1]);
    expect(fake.calls.deletes).toEqual([]);
  });
});
