import { logAnalytics } from "@/lib/analytics";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "invalid_request", "Invalid feedback");
    const { messageId, value, persona, focus, sessionId, internal } = body;

    if (typeof messageId !== "string" || !messageId || messageId.length > 128 || (value !== "up" && value !== "down") ||
      [persona, focus, sessionId].some((item) => item !== undefined && (typeof item !== "string" || item.length > 128)) ||
      (internal !== undefined && typeof internal !== "boolean")) throw new HttpError(400, "invalid_request", "Invalid feedback");

    if (internal === true) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    logAnalytics({
      type: "feedback",
      messageId,
      value,
      persona: (persona as string | undefined) ?? "unknown",
      focus: (focus as string | undefined) ?? "unknown",
      sessionId: (sessionId as string | undefined) ?? "unknown",
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
