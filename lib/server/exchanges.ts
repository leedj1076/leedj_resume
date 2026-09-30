import "server-only";
import { exchangeQuerySchema, type Exchange, type ExchangePage, type ExchangeQuery, type Session, type SessionPage } from "../domain/admin";
import { fetchAllExchanges } from "./database";
import { HttpError } from "./http";

function validate(query: ExchangeQuery): ExchangeQuery {
  const parsed = exchangeQuerySchema.safeParse(query);
  if (!parsed.success) throw new HttpError(400, "invalid_query", "Invalid exchange query");
  return parsed.data;
}

function matches(row: Exchange, query: ExchangeQuery): boolean {
  if (query.persona && row.persona !== query.persona) return false;
  switch (query.filter) {
    case "all": return true;
    case "unreviewed": return row.reviewed_at === null;
    case "reviewed": return row.reviewed_at !== null;
    case "good": return row.dj_rating === "good";
    case "needs_improvement": return row.dj_rating === "needs_improvement";
  }
}

function newestFirst(a: Exchange, b: Exchange): number {
  return b.created_at.localeCompare(a.created_at) || b.id - a.id;
}

export async function listExchanges(query: ExchangeQuery): Promise<ExchangePage> {
  const valid = validate(query);
  const matchesRows = (await fetchAllExchanges()).filter((row) => matches(row, valid)).sort(newestFirst);
  const pageSize = 20;
  return { exchanges: matchesRows.slice((valid.page - 1) * pageSize, valid.page * pageSize), total: matchesRows.length, page: valid.page, pageSize };
}

export async function listSessions(query: ExchangeQuery): Promise<SessionPage> {
  const valid = validate(query);
  const grouped = new Map<string, Exchange[]>();
  for (const row of (await fetchAllExchanges()).filter((item) => matches(item, valid))) {
    const id = row.session_id || "unknown";
    const entries = grouped.get(id) ?? [];
    entries.push(row);
    grouped.set(id, entries);
  }
  const sessions: Session[] = [...grouped].map(([session_id, exchanges]) => ({
    session_id,
    persona: exchanges[0].persona,
    focus: exchanges[0].focus,
    lang: exchanges[0].lang,
    started_at: exchanges[0].created_at,
    visitor_email: exchanges.find((row) => row.visitor_email)?.visitor_email ?? null,
    source: exchanges.find((row) => row.source)?.source ?? null,
    exchanges,
  }));
  sessions.sort((a, b) => newestFirst(a.exchanges.at(-1)!, b.exchanges.at(-1)!));
  const pageSize = 10;
  return { sessions: sessions.slice((valid.page - 1) * pageSize, valid.page * pageSize), totalSessions: sessions.length, page: valid.page, pageSize };
}
