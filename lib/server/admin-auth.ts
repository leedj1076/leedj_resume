import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";

const COOKIE = "ask_dj_admin";
const LIFETIME_MS = 28_800_000;

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

function sameBytes(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createAdminToken(
  secret: string,
  now: number,
): Promise<string> {
  if (!secret || !Number.isSafeInteger(now) || now < 0)
    throw new Error("Invalid admin session configuration");
  const payload = `v1.${now}`;
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export async function verifyAdminToken(
  token: string,
  secret: string,
  now: number,
): Promise<boolean> {
  if (
    !secret ||
    !Number.isSafeInteger(now) ||
    !/^v1\.(0|[1-9]\d*)\.[A-Za-z0-9_-]{43}$/.test(token)
  )
    return false;
  const [version, timestamp, encodedMac] = token.split(".");
  const issuedAt = Number(timestamp);
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now ||
    now - issuedAt >= LIFETIME_MS
  )
    return false;
  const providedMac = Buffer.from(encodedMac, "base64url");
  if (providedMac.toString("base64url") !== encodedMac) return false;
  return sameBytes(providedMac, signature(`${version}.${timestamp}`, secret));
}

function adminCookie(req: Request): string | null {
  const matches =
    req.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${COOKIE}=`)) ?? [];
  return matches.length === 1 ? matches[0].slice(COOKIE.length + 1) : null;
}

export async function hasAdminSession(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  const token = adminCookie(req);
  return Boolean(
    secret &&
    password &&
    token &&
    (await verifyAdminToken(token, secret, Date.now())),
  );
}

export async function requireAdmin(req: Request): Promise<void> {
  if (!(await hasAdminSession(req)))
    throw new HttpError(401, "unauthorized", "Unauthorized");
}

export function requireSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) {
    throw new HttpError(403, "invalid_origin", "Invalid request origin");
  }
}

export function verifyAdminPassword(password: unknown): boolean {
  const configured = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!configured || !secret || typeof password !== "string") return false;
  const given = createHash("sha256").update(password).digest();
  const expected = createHash("sha256").update(configured).digest();
  return sameBytes(given, expected);
}

export function sessionCookie(token: string, maxAge = 28_800): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}
