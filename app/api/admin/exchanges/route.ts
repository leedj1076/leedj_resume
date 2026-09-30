import { z } from "zod";
import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";
import { listExchanges, listSessions } from "@/lib/server/exchanges";

const requestSchema = z.object({
  page: z.number().int().positive().default(1),
  filter: z.enum(["all", "unreviewed", "reviewed", "good", "needs_improvement"]).default("all"),
  persona: z.string().min(1).optional(),
  view: z.enum(["sessions"]).optional(),
}).strict();

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    const parsed = requestSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) throw new HttpError(400, "invalid_request", "Invalid request body");
    const { page, filter, persona, view } = parsed.data;
    return Response.json(view === "sessions"
      ? await listSessions({ page, filter, persona })
      : await listExchanges({ page, filter, persona }));
  } catch (error) {
    return errorResponse(error);
  }
}
