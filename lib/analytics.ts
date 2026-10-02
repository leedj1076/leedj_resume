import { waitUntil } from "@vercel/functions";
import { getSupabaseClient } from "./supabase";

export interface AnalyticsEvent {
  type: "init" | "query" | "feedback";
  sessionId?: string;
  persona?: string;
  focus?: string;
  lang?: string;
  query?: string;
  chunksRetrieved?: number;
  chunksAfterRerank?: number;
  messageId?: string;
  value?: "up" | "down";
  visitorEmail?: string;
  timestamp?: string;
  intent?: string;
  directMatch?: string;
  directMatchScore?: number;
}

export interface ExchangeEvent {
  sessionId: string;
  persona: string;
  focus: string;
  lang: string;
  query: string;
  response: string;
  chunksUsed: string[];
  visitorEmail?: string;
  source?: string;
}

function scheduleInsert(
  table: "analytics_events" | "chat_exchanges",
  row: Record<string, unknown>,
): void {
  const client = getSupabaseClient();
  if (!client) return;
  const pending = Promise.resolve()
    .then(() => client.from(table).insert(row))
    .then(({ error }) => {
      if (error) console.error(`[${table}] Insert failed:`, error.message);
    })
    .catch((error: unknown) => {
      console.error(
        `[${table}] Insert failed:`,
        error instanceof Error ? error.message : "unknown error",
      );
    });
  try {
    waitUntil(pending);
  } catch (error) {
    console.error(`[${table}] Scheduling failed:`, error);
  }
}

export function logAnalytics(event: AnalyticsEvent): void {
  scheduleInsert("analytics_events", {
    type: event.type,
    session_id: event.sessionId,
    persona: event.persona,
    focus: event.focus,
    lang: event.lang,
    query: event.query,
    chunks_retrieved: event.chunksRetrieved,
    chunks_after_rerank: event.chunksAfterRerank,
    message_id: event.messageId,
    feedback_value: event.value,
    visitor_email: event.visitorEmail,
  });
}

export function logExchange(exchange: ExchangeEvent): void {
  scheduleInsert("chat_exchanges", {
    session_id: exchange.sessionId,
    persona: exchange.persona,
    focus: exchange.focus,
    lang: exchange.lang,
    query: exchange.query,
    response: exchange.response,
    chunks_used: exchange.chunksUsed,
    visitor_email: exchange.visitorEmail,
    source: exchange.source ?? null,
  });
}
