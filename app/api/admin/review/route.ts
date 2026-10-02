import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { saveReview } from "@/lib/server/corrections";
import { errorResponse, readJsonBody } from "@/lib/server/http";
import type { ReviewInput } from "@/lib/domain/admin";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    const result = await saveReview((await readJsonBody(req)) as ReviewInput);
    return new Response(JSON.stringify(result), {
      status: result.correctionStatus === "failed" ? 502 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
