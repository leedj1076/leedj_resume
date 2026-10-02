import "server-only";
import type { Exchange, Stats } from "../domain/admin";
import { fetchAllExchanges } from "./database";

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export async function getStats(now = new Date()): Promise<Stats> {
  const rows = await fetchAllExchanges();
  const sessions = new Map<string, Exchange[]>();
  const stats: Stats = {
    totalSessions: 0,
    totalExchanges: rows.length,
    avgExchangesPerSession: 0,
    reviewed: 0,
    unreviewed: 0,
    personaCounts: {},
    focusCounts: {},
    ratingCounts: { good: 0, needs_improvement: 0, unrated: 0 },
    langCounts: {},
    dailySessions: {},
    dailyExchanges: {},
  };
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - daysAgo);
    const key = day.toISOString().slice(0, 10);
    stats.dailySessions[key] = 0;
    stats.dailyExchanges[key] = 0;
  }
  for (const row of rows) {
    const id = row.session_id || "unknown";
    const entries = sessions.get(id) ?? [];
    entries.push(row);
    sessions.set(id, entries);
    if (row.reviewed_at) stats.reviewed++;
    else stats.unreviewed++;
    increment(stats.ratingCounts, row.dj_rating ?? "unrated");
    const day = row.created_at.slice(0, 10);
    if (day in stats.dailyExchanges) stats.dailyExchanges[day]++;
  }
  stats.totalSessions = sessions.size;
  stats.avgExchangesPerSession = stats.totalSessions
    ? Math.round((rows.length / stats.totalSessions) * 10) / 10
    : 0;
  for (const exchanges of sessions.values()) {
    const first = exchanges[0];
    increment(stats.personaCounts, first.persona);
    increment(stats.focusCounts, first.focus);
    increment(stats.langCounts, first.lang || "en");
    const day = first.created_at.slice(0, 10);
    if (day in stats.dailySessions) stats.dailySessions[day]++;
  }
  return stats;
}
