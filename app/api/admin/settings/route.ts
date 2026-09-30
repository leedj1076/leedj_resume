import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";
import { settingsPatchSchema } from "@/lib/domain/admin";
import { saveSettings } from "@/lib/server/settings";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    const parsed = settingsPatchSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) throw new HttpError(400, "invalid_settings", "Invalid settings");
    return Response.json(await saveSettings(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
