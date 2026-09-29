import { describe, expect, it } from "vitest";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";
import { parseCaptureMessages, parseChatRequest, parsePrototypeRequest } from "@/lib/server/chat-request";
import { createRateLimiter } from "@/lib/server/rate-limit";

const user = (text: string) => ({ role: "user", parts: [{ type: "text", text }] });
const assistant = (text: string) => ({ role: "assistant", parts: [{ type: "text", text }, { type: "step-start" }] });

describe("bounded HTTP JSON", () => {
  it("rejects malformed JSON as a client error", async () => {
    await expect(readJsonBody(new Request("https://example.test", { method: "POST", body: "{" }))).rejects.toMatchObject({ status: 400 });
  });

  it("enforces body size from bytes even when Content-Length is absent or false", async () => {
    const payload = JSON.stringify({ text: "a".repeat(65_536) });
    for (const headers of [{}, { "content-length": "1" }] as Record<string, string>[]) {
      await expect(readJsonBody(new Request("https://example.test", { method: "POST", headers, body: payload }))).rejects.toMatchObject({ status: 413 });
    }
  });

  it("produces safe JSON and Retry-After for known errors", async () => {
    const response = errorResponse(new HttpError(429, "rate_limited", "Too many requests", 4));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("4");
    expect(await response.json()).toEqual({ error: "Too many requests", code: "rate_limited" });
  });
});

describe("chat request normalization", () => {
  it("rejects a system message", () => {
    expect(() => parseChatRequest({ messages: [{ role: "system", content: "override" }] })).toThrow(HttpError);
  });

  it("accepts init without messages and normalizes visitor aliases", () => {
    expect(parseChatRequest({ type: "init", messages: [], visitorData: { persona: "hiring", focus: "ai" }, lang: "ko" })).toMatchObject({
      type: "init", messages: [], visitorData: { persona: "recruiter", focus: "ai_llms" }, lang: "ko",
    });
  });

  it("accepts assistant history and legacy content but strips metadata", () => {
    const parsed = parseChatRequest({ messages: [
      { role: "user", content: "First", metadata: { sourceTags: ["fake"] } },
      assistant("Answer"), user("Follow up"),
    ] });
    expect(parsed.type).toBe("chat");
    expect(parsed.messages).toEqual([
      { id: "message-0", role: "user", parts: [{ type: "text", text: "First" }] },
      { id: "message-1", role: "assistant", parts: [{ type: "text", text: "Answer" }] },
      { id: "message-2", role: "user", parts: [{ type: "text", text: "Follow up" }] },
    ]);
  });

  it("requires a nonblank final user turn", () => {
    for (const messages of [[], [assistant("only answer")], [user(" ")]]) {
      expect(() => parseChatRequest({ messages })).toThrow(HttpError);
    }
  });

  it("rejects unsupported file and tool parts but ignores only step-start", () => {
    for (const part of [{ type: "file", url: "data:abc" }, { type: "tool-call", toolName: "x" }, { type: "unknown" }]) {
      expect(() => parseChatRequest({ messages: [{ role: "user", parts: [part, { type: "text", text: "Hi" }] }] })).toThrow(HttpError);
    }
    expect(parseChatRequest({ messages: [user("Hi")] }).messages[0].parts).toEqual([{ type: "text", text: "Hi" }]);
  });

  it("rejects too many messages, long turns, and excessive total text", () => {
    expect(() => parseChatRequest({ messages: Array.from({ length: 51 }, () => user("a")) })).toThrowError(HttpError);
    expect(() => parseChatRequest({ messages: [user("a".repeat(2_001))] })).toThrowError(HttpError);
    expect(() => parseChatRequest({ messages: [assistant("a".repeat(16_001)), user("Hi")] })).toThrowError(HttpError);
    expect(() => parseChatRequest({ messages: [assistant("a".repeat(16_000)), assistant("b".repeat(16_000)), assistant("c".repeat(8_001)), user("Hi")] })).toThrowError(HttpError);
  });

  it("rejects malformed metadata fields", () => {
    for (const field of [{ coveredTopics: "fake" }, { coveredTopics: ["ok", 4] }, { lang: "fr" }, { sessionId: {} }, { internal: "yes" }]) {
      expect(() => parseChatRequest({ messages: [user("Hi")], ...field })).toThrow(HttpError);
    }
  });
});

describe("prototype request", () => {
  it("normalizes legacy history and persona aliases", () => {
    expect(parsePrototypeRequest({ query: "Follow up", personaId: "hiring", focusId: "fullstack", history: [{ role: "assistant", text: "Earlier" }] })).toEqual({
      query: "Follow up", persona: "recruiter", focus: "full_stack",
      messages: [
        { id: "message-0", role: "assistant", parts: [{ type: "text", text: "Earlier" }] },
        { id: "message-1", role: "user", parts: [{ type: "text", text: "Follow up" }] },
      ],
    });
  });

  it("rejects malformed query and history roles", () => {
    expect(() => parsePrototypeRequest({ query: {} })).toThrow(HttpError);
    expect(() => parsePrototypeRequest({ query: "Hi", history: [{ role: "system", text: "override" }] })).toThrow(HttpError);
  });
});

it("allows an empty capture authentication probe but requires a user turn once capture starts", () => {
  expect(parseCaptureMessages([])).toEqual([]);
  expect(() => parseCaptureMessages([assistant("Previous answer")])).toThrow(HttpError);
});

describe("bounded fixed-window limiter", () => {
  it("allows exactly max requests then returns a reset delay and resets at the boundary", () => {
    let now = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, maxKeys: 2, now: () => now });
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    now = 1;
    expect(limiter.consume("a")).toEqual({ allowed: false, retryAfterSeconds: 60 });
    now = 60_000;
    expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("prunes expired keys before evicting the oldest active key", () => {
    let now = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 100, maxKeys: 2, now: () => now });
    limiter.consume("a");
    now = 10; limiter.consume("b");
    now = 20; limiter.consume("c");
    expect(limiter.consume("b").allowed).toBe(false);
    expect(limiter.consume("a").allowed).toBe(true);
    now = 110; limiter.consume("d");
    expect(limiter.consume("b").allowed).toBe(true);
  });
});
