import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/server/http";

const boundary = vi.hoisted(() => ({ chat: vi.fn(), prototype: vi.fn(), capture: vi.fn(), admit: vi.fn(), admin: vi.fn(), origin: vi.fn() }));
vi.mock("@/lib/server/chat-service", () => ({ handleChat: boundary.chat }));
vi.mock("@/lib/server/prototype-service", () => ({ handlePrototypeChat: boundary.prototype }));
vi.mock("@/lib/server/capture-service", () => ({ handleCapture: boundary.capture }));
vi.mock("@/lib/server/rate-limit", () => ({ admitPublicChat: boundary.admit }));
vi.mock("@/lib/server/admin-auth", () => ({ requireAdmin: boundary.admin, requireSameOrigin: boundary.origin }));

const url = "https://example.test/api/chat";
const body = { messages: [{ role: "user", content: "Hello" }], visitorData: { persona: "general", focus: "full_stack" } };
const request = (payload: unknown, target = url) => new Request(target, { method: "POST", body: JSON.stringify(payload), headers: { origin: "https://example.test" } });

beforeEach(() => {
  vi.resetAllMocks();
  boundary.admit.mockReturnValue(null);
  boundary.chat.mockResolvedValue(new Response("data: ok", { headers: { "Content-Type": "text/event-stream" } }));
  boundary.prototype.mockResolvedValue({ response: "Prototype answer", chunksUsed: ["exp-flint-overview"] });
  boundary.capture.mockResolvedValue(new Response("data: capture", { headers: { "Content-Type": "text/event-stream" } }));
});

describe("public chat route", () => {
  it("admits a malformed public request before returning 400", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(request({ ...body, messages: [] }));
    expect(response.status).toBe(400);
    expect(boundary.admit).toHaveBeenCalledOnce();
    expect(boundary.chat).not.toHaveBeenCalled();
  });

  it("applies public admission when JSON cannot be parsed", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(new Request(url, { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(boundary.admit).toHaveBeenCalledOnce();
    expect(boundary.chat).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated internal traffic before providers and never admits it as public", async () => {
    boundary.admin.mockRejectedValue(new HttpError(401, "unauthorized", "Unauthorized"));
    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(request({ ...body, internal: true }));
    expect(response.status).toBe(401);
    expect(boundary.chat).not.toHaveBeenCalled();
    expect(boundary.admit).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies with 413", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(new Request(url, { method: "POST", headers: { "content-length": "70000" }, body: "{}" }));
    expect(response.status).toBe(413);
    expect(boundary.chat).not.toHaveBeenCalled();
  });

  it("returns limiter 429 with retry header", async () => {
    boundary.admit.mockReturnValue(new Response("limited", { status: 429, headers: { "Retry-After": "6" } }));
    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(request(body));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("6");
    expect(boundary.chat).not.toHaveBeenCalled();
  });

  it("turns service failures into 500 and preserves a successful event stream", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const stream = await POST(request(body));
    expect(stream.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await stream.text()).toBe("data: ok");
    boundary.chat.mockRejectedValueOnce(new Error("provider failed"));
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = await POST(request(body));
    expect(failed.status).toBe(500);
    diagnostic.mockRestore();
  });
});

describe("prototype and capture routes", () => {
  it("keeps prototype JSON response", async () => {
    const { POST } = await import("@/app/api/ui-chat/route");
    const response = await POST(request({ query: "Hello", personaId: "general", focusId: "full_stack" }, "https://example.test/api/ui-chat"));
    expect(await response.json()).toEqual({ response: "Prototype answer", chunksUsed: ["exp-flint-overview"] });
    expect(boundary.prototype).toHaveBeenCalledOnce();
  });

  it("requires capture authentication and preserves its stream", async () => {
    const { POST } = await import("@/app/api/capture/route");
    boundary.admin.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Unauthorized"));
    expect((await POST(request({ messages: [] }, "https://example.test/api/capture"))).status).toBe(401);
    expect(boundary.capture).not.toHaveBeenCalled();
    const success = await POST(request({ messages: [] }, "https://example.test/api/capture"));
    expect(success.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await success.text()).toBe("data: capture");
  });
});
