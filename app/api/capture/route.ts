import { errorResponse, readJsonBody, HttpError } from "@/lib/server/http";
import { parseCaptureMessages } from "@/lib/server/chat-request";
import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { handleCapture } from "@/lib/server/capture-service";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    const body = await readJsonBody(req);
    const messages = parseCaptureMessages(body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).messages : undefined);
    return await handleCapture(messages, req.signal);
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("[CAPTURE] Error:", error);
    return errorResponse(error);
  }
}
