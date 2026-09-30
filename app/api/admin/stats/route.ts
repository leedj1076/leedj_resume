import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { errorResponse } from "@/lib/server/http";
import { getStats } from "@/lib/server/events";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    return Response.json(await getStats());
  } catch (error) {
    return errorResponse(error);
  }
}
