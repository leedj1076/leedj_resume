import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const database = vi.hoisted(() => ({ available: true, rejectWrite: false, rejectRead: false, settings: new Map<string, string>(), exchanges: [] as Row[], ranges: [] as [number, number][] }));

vi.mock("@/lib/supabase", () => {
  const client = { from(table: string) {
    if (table === "app_settings") return {
      select() { return { eq(_column: string, key: string) { return { async single() {
        if (database.rejectRead) return { data: null, error: { code: "UNAVAILABLE", message: "storage unavailable" } };
        const value = database.settings.get(key);
        return { data: value === undefined ? null : { value }, error: null };
      } }; } }; },
      async upsert(input: Row | Row[]) {
        if (database.rejectWrite) return { data: null, error: { message: "write rejected" } };
        for (const row of Array.isArray(input) ? input : [input]) database.settings.set(String(row.key), String(row.value));
        return { data: input, error: null };
      },
    };
    if (table !== "chat_exchanges") throw new Error(`Unexpected table: ${table}`);
    const clauses: Array<(row: Row) => boolean> = [];
    let ascending = true; let start = 0; let end = Number.MAX_SAFE_INTEGER;
    const builder = {
      select() { return builder; },
      eq(column: string, value: unknown) { clauses.push((row) => row[column] === value); return builder; },
      is(column: string, value: null) { clauses.push((row) => row[column] === value); return builder; },
      not(column: string, _operator: string, value: null) { clauses.push((row) => row[column] !== value); return builder; },
      order(column: string, options: { ascending: boolean }) { if (column === "created_at") ascending = options.ascending; return builder; },
      range(first: number, last: number) { start = first; end = last; database.ranges.push([first, last]); return builder; },
      then(resolve: (result: unknown) => unknown) {
        const rows = database.exchanges.filter((row) => clauses.every((clause) => clause(row)))
          .sort((a, b) => (String(a.created_at).localeCompare(String(b.created_at)) || Number(a.id) - Number(b.id)) * (ascending ? 1 : -1));
        return Promise.resolve(resolve({ data: rows.slice(start, end + 1), count: rows.length, error: null }));
      },
    };
    return builder;
  } };
  return { supabase: client, getSupabaseClient: () => database.available ? client : null };
});

import { getAnswerMode, setAnswerMode } from "@/lib/settings";
import { readSettings, saveSettings } from "@/lib/server/settings";
import { listExchanges, listSessions } from "@/lib/server/exchanges";
import { getStats } from "@/lib/server/events";

function exchange(id: number, sessionId = `session-${id}`): Row {
  return { id, created_at: "2026-09-20T00:00:00.000Z", session_id: sessionId, persona: "founder", focus: "general", lang: "en", query: `question ${id}`, response: `answer ${id}`, chunks_used: [], visitor_email: null, source: null, dj_rating: null, dj_comment: null, improvement_text: null, pinecone_chunk_id: null, reviewed_at: null };
}

describe("settings persistence", () => {
  beforeEach(() => { database.available = true; database.rejectWrite = false; database.rejectRead = false; database.settings.clear(); });
  it("does not report rejected writes as saved", async () => {
    database.rejectWrite = true;
    await expect(saveSettings({ mode: "pyramid" })).rejects.toThrow("write rejected");
    expect(await getAnswerMode()).toBe("default");
  });
  it("returns defaults for optional unavailable storage but rejects writes", async () => {
    database.available = false;
    expect((await readSettings()).mode).toBe("default");
    await expect(saveSettings({ mode: "pyramid" })).rejects.toMatchObject({ status: 503 });
  });
  it("uses public defaults when optional storage reads fail", async () => {
    database.rejectRead = true;
    expect((await readSettings()).mode).toBe("default");
  });
  it("reports a successful write accurately when the following read is unavailable", async () => {
    database.rejectRead = true;
    expect((await saveSettings({ mode: "pyramid" })).mode).toBe("pyramid");
    expect(database.settings.get("answer_mode")).toBe("pyramid");
  });
  it("fresh reads observe changed answer modes", async () => {
    await setAnswerMode("pyramid");
    expect(await getAnswerMode()).toBe("pyramid");
    database.settings.set("answer_mode", "default");
    expect(await getAnswerMode()).toBe("default");
  });
});

describe("paged exchanges and statistics", () => {
  beforeEach(() => { database.available = true; database.exchanges = []; database.ranges = []; });
  it("returns empty pages and zero statistics", async () => {
    expect(await listExchanges({ page: 1, filter: "all" })).toMatchObject({ exchanges: [], total: 0, pageSize: 20 });
    expect(await listSessions({ page: 1, filter: "all" })).toMatchObject({ sessions: [], totalSessions: 0, pageSize: 10 });
    expect(await getStats(new Date("2026-09-30T00:00:00.000Z"))).toMatchObject({ totalExchanges: 0, totalSessions: 0 });
  });
  it("reads 2,501 tied-timestamp rows across exact 500-row boundaries", async () => {
    database.exchanges = Array.from({ length: 2501 }, (_, index) => exchange(index + 1, `session-${Math.floor(index / 2)}`));
    const stats = await getStats(new Date("2026-09-30T00:00:00.000Z"));
    expect(stats.totalExchanges).toBe(2501);
    expect(stats.totalSessions).toBe(1251);
    expect(stats.personaCounts.founder).toBe(1251);
    expect(database.ranges).toEqual([[0, 499], [500, 999], [1000, 1499], [1500, 1999], [2000, 2499], [2500, 2999]]);
    const sessions = await listSessions({ page: 1, filter: "all" });
    expect(sessions.totalSessions).toBe(1251);
    expect(sessions.sessions).toHaveLength(10);
    expect(sessions.sessions[0].exchanges).toHaveLength(1);
    expect(stats.dailyExchanges["2026-09-20"]).toBe(2501);
    expect(stats.dailySessions["2026-09-20"]).toBe(1251);
    const secondPage = await listExchanges({ page: 2, filter: "all" });
    expect(secondPage.exchanges).toHaveLength(20);
    expect(secondPage.exchanges[0].id).toBe(2481);
  });
  it("continues once past an exact batch boundary", async () => {
    database.exchanges = Array.from({ length: 1000 }, (_, index) => exchange(index + 1));
    expect((await getStats()).totalExchanges).toBe(1000);
    expect(database.ranges).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });
  it("rejects invalid filters and pages", async () => {
    await expect(listExchanges({ page: 0, filter: "all" })).rejects.toMatchObject({ status: 400 });
    await expect(listSessions({ page: 1, filter: "bogus" as "all" })).rejects.toMatchObject({ status: 400 });
  });
  it("filters reviews and validates database rows", async () => {
    database.exchanges = [exchange(1), { ...exchange(2), reviewed_at: "2026-09-21T00:00:00.000Z", dj_rating: "good" }];
    expect((await listExchanges({ page: 1, filter: "good" })).exchanges.map((row) => row.id)).toEqual([2]);
    expect((await listSessions({ page: 1, filter: "unreviewed" })).totalSessions).toBe(1);
    database.exchanges = [{ ...exchange(1), id: "not-an-integer" }];
    await expect(getStats()).rejects.toThrow();
  });
});
