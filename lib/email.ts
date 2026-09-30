import { waitUntil } from "@vercel/functions";
import { Resend } from "resend";

export interface NewSessionAlert {
  query: string;
  persona: string;
  focus: string;
  lang: string;
  sessionId: string;
  visitorEmail?: string;
  internal?: boolean;
}

let warnedIncomplete = false;

export function sendNewSessionAlert(data: NewSessionAlert): void {
  if (data.internal) return;
  const { RESEND_API_KEY: key, RESEND_FROM: from, RESEND_TO: to } = process.env;
  if (!key || !from || !to) {
    if (!warnedIncomplete) {
      console.warn("[EMAIL] Alert disabled: RESEND_API_KEY, RESEND_FROM, and RESEND_TO are required");
      warnedIncomplete = true;
    }
    return;
  }

  const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  const text = [
    "New chat session",
    `Query: ${data.query}`,
    `Persona: ${data.persona}`,
    `Focus: ${data.focus}`,
    `Language: ${data.lang}`,
    `Visitor Email: ${data.visitorEmail || "N/A"}`,
    `Session: ${data.sessionId}`,
    `Time (KST): ${timestamp}`,
  ].join("\n");

  const send = Promise.resolve().then(() => new Resend(key).emails.send({
    from, to, subject: "New Ask DJ visitor", text,
  })).then((result) => {
    if (result.error) console.error("[EMAIL] Alert provider rejected the send:", result.error.message);
  }).catch((error: unknown) => {
    console.error("[EMAIL] Alert send failed:", error instanceof Error ? error.message : "unknown error");
  });
  try { waitUntil(send); }
  catch (error) { console.error("[EMAIL] Alert scheduling failed:", error); }
}
