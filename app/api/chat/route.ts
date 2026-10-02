import { readJsonBody, errorResponse, HttpError } from "@/lib/server/http";
import { parseChatRequest } from "@/lib/server/chat-request";
import { admitPublicChat } from "@/lib/server/rate-limit";
import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { handleChat } from "@/lib/server/chat-service";

export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  try {
    let raw: unknown;
    try {
      raw = await readJsonBody(req);
    } catch (error) {
      // Invalid JSON cannot establish the internal-session exemption. Count it
      // against public admission before returning the parsing error.
      const denied = admitPublicChat(req);
      if (denied) return denied;
      throw error;
    }
    const requestedInternal = raw !== null && typeof raw === "object" && !Array.isArray(raw)
      && (raw as Record<string, unknown>).internal === true;
    if (requestedInternal) {
      await requireAdmin(req);
      requireSameOrigin(req);
    } else {
      const denied = admitPublicChat(req);
      if (denied) return denied;
    }
    const request = parseChatRequest(raw);
    return await handleChat(request, { signal: req.signal, internal: requestedInternal });
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("[RAG] Error:", error);
    return errorResponse(error);
  }
}
