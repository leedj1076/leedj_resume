import { HttpError, errorResponse } from "./http";

export function createRateLimiter(options: { max: number; windowMs: number; maxKeys: number; now?: () => number }) {
  const entries = new Map<string, { count: number; resetAt: number }>();
  const clock = options.now ?? Date.now;
  return {
    consume(key: string): { allowed: boolean; retryAfterSeconds: number } {
      const now = clock();
      const existing = entries.get(key);
      if (existing && now < existing.resetAt) {
        if (existing.count >= options.max) {
          return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
        }
        existing.count += 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }

      entries.delete(key);
      for (const [entryKey, entry] of entries) {
        if (now >= entry.resetAt) entries.delete(entryKey);
      }
      if (entries.size >= options.maxKeys) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey !== undefined) entries.delete(oldestKey);
      }
      entries.set(key, { count: 1, resetAt: now + options.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

// This pool is process-local. Separate instances/deployments have independent limits.
const publicChatLimiter = createRateLimiter({ max: 15, windowMs: 60_000, maxKeys: 10_000 });

export function admitPublicChat(req: Request): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = publicChatLimiter.consume(ip);
  return result.allowed ? null : errorResponse(new HttpError(
    429, "rate_limited", "Too many requests. Please wait a moment.", result.retryAfterSeconds,
  ));
}
