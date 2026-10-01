import { readJsonBody, errorResponse, HttpError } from "@/lib/server/http";
import { parsePrototypeRequest } from "@/lib/server/chat-request";
import { admitPublicChat } from "@/lib/server/rate-limit";
import { handlePrototypeChat } from "@/lib/server/prototype-service";

export async function POST(req: Request): Promise<Response> {
  const denied = admitPublicChat(req);
  if (denied) return denied;
  try {
    const request = parsePrototypeRequest(await readJsonBody(req));
    return Response.json(await handlePrototypeChat(request, req.signal));
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("[UI-CHAT] Error:", error);
    return errorResponse(error);
  }
}
