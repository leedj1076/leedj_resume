import { createAdminToken, requireAdmin, requireSameOrigin, sessionCookie, verifyAdminPassword } from "@/lib/server/admin-auth";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/rate-limit";

// This single-owner admin has one bounded process-local login bucket. Caller-supplied
// forwarding headers cannot create fresh buckets or evade the five-attempt limit.
const loginLimiter = createRateLimiter({ max: 5, windowMs: 60_000, maxKeys: 1 });

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin(req);
    return Response.json({ authenticated: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    requireSameOrigin(req);
    const admission = loginLimiter.consume("admin-login");
    if (!admission.allowed) throw new HttpError(429, "rate_limited", "Too many login attempts", admission.retryAfterSeconds);
    const body = await readJsonBody(req, 2_048);
    const password = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).password : undefined;
    if (!verifyAdminPassword(password)) throw new HttpError(401, "unauthorized", "Unauthorized");
    const token = await createAdminToken(process.env.ADMIN_SESSION_SECRET!, Date.now());
    return Response.json({ authenticated: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    requireSameOrigin(req);
    return Response.json({ authenticated: false }, { headers: { "Set-Cookie": sessionCookie("", 0) } });
  } catch (error) {
    return errorResponse(error);
  }
}
