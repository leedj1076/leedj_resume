import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminToken, requireAdmin, requireSameOrigin, verifyAdminToken } from "@/lib/server/admin-auth";
import { GET, POST, DELETE } from "@/app/api/admin/session/route";
import { POST as settingsPost } from "@/app/api/admin/settings/route";
import { POST as exchangesPost } from "@/app/api/admin/exchanges/route";
import { POST as reviewPost } from "@/app/api/admin/review/route";
import { POST as statsPost } from "@/app/api/admin/stats/route";
import { POST as capturePost } from "@/app/api/capture/route";
import { POST as feedbackPost } from "@/app/api/feedback/route";
import { POST as chatPost } from "@/app/api/chat/route";
import { generateText } from "ai";
import { logAnalytics, logExchange } from "@/lib/analytics";
import { sendNewSessionAlert } from "@/lib/email";

vi.mock("@/lib/analytics", () => ({ logAnalytics: vi.fn(), logExchange: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendNewSessionAlert: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({ ...await importOriginal<typeof import("ai")>(), generateText: vi.fn() }));

const originalPassword = process.env.ADMIN_PASSWORD;
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const url = "https://example.test/api/admin/session";
const mutation = (path: string, body: unknown, headers: Record<string, string> = {}) => new Request(`https://example.test${path}`, {
  method: "POST", headers: { origin: "https://example.test", "content-type": "application/json", ...headers }, body: JSON.stringify(body),
});

afterEach(() => {
  process.env.ADMIN_PASSWORD = originalPassword;
  process.env.ADMIN_SESSION_SECRET = originalSecret;
  vi.useRealTimers();
  vi.mocked(logAnalytics).mockClear();
  vi.mocked(logExchange).mockClear();
  vi.mocked(sendNewSessionAlert).mockClear();
  vi.mocked(generateText).mockReset();
});

describe("signed admin sessions", () => {
  it("rejects tampering, expiry, rotation, malformed encoding and future dates", async () => {
    const token = await createAdminToken("test-secret", 1_000);
    expect(await verifyAdminToken(token, "test-secret", 1_000)).toBe(true);
    expect(await verifyAdminToken(token, "test-secret", 1_000 + 28_799_999)).toBe(true);
    expect(await verifyAdminToken(token, "test-secret", 1_000 + 28_800_000)).toBe(false);
    expect(await verifyAdminToken(token, "rotated-secret", 1_000)).toBe(false);
    expect(await verifyAdminToken(token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a"), "test-secret", 1_000)).toBe(false);
    expect(await verifyAdminToken("v1.1000.%", "test-secret", 1_000)).toBe(false);
    expect(await verifyAdminToken(token, "test-secret", 999)).toBe(false);
  });

  it("requires a configured secret and a valid cookie", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    await expect(requireAdmin(new Request(url))).rejects.toMatchObject({ status: 401 });
    const token = await createAdminToken("test-secret", Date.now());
    await expect(requireAdmin(new Request(url, { headers: { cookie: `ask_dj_admin=${token}` } }))).resolves.toBeUndefined();
    delete process.env.ADMIN_SESSION_SECRET;
    await expect(requireAdmin(new Request(url, { headers: { cookie: `ask_dj_admin=${token}` } }))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects missing or cross-origin mutation origins", () => {
    expect(() => requireSameOrigin(new Request(url, { method: "POST" }))).toThrow();
    expect(() => requireSameOrigin(new Request(url, { method: "POST", headers: { origin: "https://evil.test" } }))).toThrow();
    expect(() => requireSameOrigin(new Request(url, { method: "POST", headers: { origin: "https://example.test" } }))).not.toThrow();
  });

  it("fails closed when credentials are missing and sets a strict cookie after login", async () => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
    expect((await POST(mutation("/api/admin/session", { password: "" }))).status).toBe(401);
    process.env.ADMIN_PASSWORD = "correct";
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    expect((await POST(mutation("/api/admin/session", { password: "wrong" }))).status).toBe(401);
    const response = await POST(mutation("/api/admin/session", { password: "correct" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/ask_dj_admin=.*HttpOnly.*SameSite=Strict/);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=28800");
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    expect((await GET(new Request(url, { headers: { cookie } }))).status).toBe(200);
    expect((await DELETE(new Request(url, { method: "DELETE", headers: { cookie, origin: "https://example.test" } }))).headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("rejects cross-origin login and limits password attempts to five per minute", async () => {
    process.env.ADMIN_PASSWORD = "correct";
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    expect((await POST(mutation("/api/admin/session", { password: "correct" }, { origin: "https://evil.test" }))).status).toBe(403);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await POST(mutation("/api/admin/session", { password: "wrong" }, { "x-forwarded-for": "198.51.100.42" }))).status).toBe(401);
    }
    const limited = await POST(mutation("/api/admin/session", { password: "correct" }, { "x-forwarded-for": "198.51.100.42" }));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("authorizes protected routes before settings or capture services", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "correct";
    expect((await settingsPost(mutation("/api/admin/settings", { mode: "pyramid", password: "correct" }))).status).toBe(401);
    expect((await capturePost(mutation("/api/capture", { messages: [], password: "correct" }))).status).toBe(401);
    expect((await exchangesPost(mutation("/api/admin/exchanges", { password: "correct" }))).status).toBe(401);
    expect((await reviewPost(mutation("/api/admin/review", { password: "correct" }))).status).toBe(401);
    expect((await statsPost(mutation("/api/admin/stats", { password: "correct" }))).status).toBe(401);
  });

  it("tracks forged internal feedback while a signed internal request skips tracking", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    const payload = { messageId: "m1", value: "up", internal: true };
    expect((await feedbackPost(mutation("/api/feedback", payload))).status).toBe(200);
    expect(logAnalytics).toHaveBeenCalledTimes(1);
    vi.mocked(logAnalytics).mockClear();
    const token = await createAdminToken("test-secret", Date.now());
    expect((await feedbackPost(mutation("/api/feedback", payload, { cookie: `ask_dj_admin=${token}` }))).status).toBe(200);
    expect(logAnalytics).not.toHaveBeenCalled();
  });

  it("does not return a trace or suppress tracking and alerts for forged internal chat", async () => {
    vi.mocked(generateText).mockResolvedValue({ text: JSON.stringify({ intent: "ambiguous", query: "vague", clarifications: ["Which topic?"] }) } as Awaited<ReturnType<typeof generateText>>);
    const response = await chatPost(mutation("/api/chat", { messages: [{ role: "user", content: "vague" }], internal: true }));
    expect(response.status).toBe(200);
    const stream = await response.text();
    expect(stream).not.toContain('"trace"');
    expect(logAnalytics).toHaveBeenCalledTimes(1);
    expect(logExchange).toHaveBeenCalledTimes(1);
    expect(sendNewSessionAlert).toHaveBeenCalledTimes(1);
  });

  it("returns a trace and skips tracking and alerts for signed internal chat", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    const token = await createAdminToken("test-secret", Date.now());
    vi.mocked(generateText).mockResolvedValue({ text: JSON.stringify({ intent: "ambiguous", query: "vague", clarifications: ["Which topic?"] }) } as Awaited<ReturnType<typeof generateText>>);
    const response = await chatPost(mutation("/api/chat", { messages: [{ role: "user", content: "vague" }], internal: true }, { cookie: `ask_dj_admin=${token}` }));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('"trace"');
    expect(logAnalytics).not.toHaveBeenCalled();
    expect(logExchange).not.toHaveBeenCalled();
    expect(sendNewSessionAlert).not.toHaveBeenCalled();
  });
});
