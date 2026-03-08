import { supabase } from "./supabase";

export function logAnalytics(event: Record<string, unknown>): void {
  console.log("[ANALYTICS]", JSON.stringify(event));

  supabase
    ?.from("analytics_events")
    .insert({
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
    })
    .then(({ error }) => {
      if (error) console.error("[ANALYTICS] Supabase insert error:", error.message);
    });
}

export function logExchange(exchange: {
  sessionId: string;
  persona: string;
  focus: string;
  lang: string;
  query: string;
  response: string;
  chunksUsed: string[];
  visitorEmail?: string;
}): void {
  supabase
    ?.from("chat_exchanges")
    .insert({
      session_id: exchange.sessionId,
      persona: exchange.persona,
      focus: exchange.focus,
      lang: exchange.lang,
      query: exchange.query,
      response: exchange.response,
      chunks_used: exchange.chunksUsed,
      visitor_email: exchange.visitorEmail,
    })
    .then(({ error }) => {
      if (error) console.error("[EXCHANGE] Supabase insert error:", error.message);
    });
}
