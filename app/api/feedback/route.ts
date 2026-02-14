import { logAnalytics } from "@/lib/analytics";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messageId, value, persona, focus, sessionId } = body;

    if (!messageId || !["up", "down"].includes(value)) {
      return new Response(JSON.stringify({ error: "Invalid feedback" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    logAnalytics({
      type: "feedback",
      messageId,
      value,
      persona: persona ?? "unknown",
      focus: focus ?? "unknown",
      sessionId: sessionId ?? "unknown",
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
