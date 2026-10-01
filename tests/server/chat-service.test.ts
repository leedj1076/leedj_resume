import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseChatRequest } from "@/lib/server/chat-request";

const p = vi.hoisted(() => ({
  rewrite: vi.fn(), embed: vi.fn(), search: vi.fn(), fetch: vi.fn(), mode: vi.fn(),
  stream: vi.fn(), generate: vi.fn(),
}));
vi.mock("@/lib/server/providers", () => ({
  rewriteQuery: p.rewrite, embedQuery: p.embed, searchChunks: p.search,
  fetchChunks: p.fetch, readAnswerMode: p.mode, streamAnswer: p.stream,
  generateAnswer: p.generate,
}));
vi.mock("@/lib/analytics", () => ({ logAnalytics: vi.fn(), logExchange: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendNewSessionAlert: vi.fn() }));

function request(query: string) {
  const value = parseChatRequest({ messages: [{ role: "user", content: query }], visitorData: { persona: "general", focus: "full_stack" } });
  if (value.type !== "chat") throw new Error("Expected chat");
  return value;
}

beforeEach(() => {
  vi.clearAllMocks();
  p.rewrite.mockResolvedValue(JSON.stringify({ intent: "specific", query: "rewritten topic", clarifications: [] }));
  p.embed.mockResolvedValue([0.1, 0.2]);
  p.search.mockResolvedValue([]);
  p.fetch.mockResolvedValue([]);
  p.mode.mockResolvedValue("default");
});

describe("prepareAnswer", () => {
  it("answers an ambiguous request without vector search", async () => {
    p.rewrite.mockResolvedValue(JSON.stringify({ intent: "ambiguous", query: "thing", clarifications: ["Which role?"] }));
    const { prepareAnswer } = await import("@/lib/server/rag-service");
    const prepared = await prepareAnswer(request("What about that?"), new AbortController().signal);
    expect(prepared.clarification).toContain("Which role?");
    expect(p.search).not.toHaveBeenCalled();
    expect(p.embed).not.toHaveBeenCalled();
  });

  it("uses one embedding for unchanged rewrite and searches original-question Q&A", async () => {
    p.rewrite.mockResolvedValue(JSON.stringify({ intent: "specific", query: "What did you do at Flint?", clarifications: [] }));
    const { prepareAnswer } = await import("@/lib/server/rag-service");
    await prepareAnswer(request("What did you do at Flint?"), new AbortController().signal);
    expect(p.embed).toHaveBeenCalledTimes(1);
    expect(p.search).toHaveBeenCalledWith(expect.objectContaining({ filter: { chunk_type: { $eq: "qa_story" } }, vector: [0.1, 0.2] }), expect.any(AbortSignal));
  });

  it("keeps original-question matching when rewrite fails", async () => {
    p.rewrite.mockRejectedValue(new Error("offline"));
    const { prepareAnswer } = await import("@/lib/server/rag-service");
    await prepareAnswer(request("What did you do at Flint?"), new AbortController().signal);
    expect(p.embed).toHaveBeenCalledTimes(1);
    expect(p.search).toHaveBeenCalledWith(expect.objectContaining({ filter: { chunk_type: { $eq: "qa_story" } } }), expect.any(AbortSignal));
  });

  it("detects the company filter from the visitor question after a generic rewrite", async () => {
    p.rewrite.mockResolvedValue(JSON.stringify({ intent: "specific", query: "leadership skills", clarifications: [] }));
    const { prepareAnswer } = await import("@/lib/server/rag-service");
    await prepareAnswer(request("What did you do at Flint?"), new AbortController().signal);
    expect(p.search).toHaveBeenCalledWith(expect.objectContaining({ filter: { company: { $eq: "Flint Technologies" } } }), expect.any(AbortSignal));
  });

  it("uses an explicit evaluation mode without loading Next server settings", async () => {
    const { prepareAnswer } = await import("@/lib/server/rag-service");
    await prepareAnswer(request("Hello"), new AbortController().signal, { answerMode: "default" });
    expect(p.mode).not.toHaveBeenCalled();
  });

  it("stops after cancellation before later provider stages", async () => {
    const controller = new AbortController();
    p.rewrite.mockImplementation(async () => { controller.abort(); return "{}"; });
    const { prepareAnswer } = await import("@/lib/server/rag-service");
    await expect(prepareAnswer(request("Hello"), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(p.embed).not.toHaveBeenCalled();
    expect(p.search).not.toHaveBeenCalled();
  });
});

describe("chat orchestration", () => {
  it("does not log a completed exchange after cancellation", async () => {
    const controller = new AbortController();
    p.stream.mockImplementation(({ onFinish }: { onFinish: (text: string) => void }) => {
      controller.abort();
      onFinish("partial answer");
      return { toUIMessageStreamResponse: () => new Response("stream") };
    });
    const { handleChat } = await import("@/lib/server/chat-service");
    const { logExchange } = await import("@/lib/analytics");
    await handleChat(request("What did you do at Flint?"), { signal: controller.signal, internal: false });
    expect(logExchange).not.toHaveBeenCalled();
  });

  it("logs context IDs and sends public source metadata without diagnostic trace", async () => {
    p.fetch.mockResolvedValue([{ id: "exp-flint-overview", enrichedText: "Flint experience", depth: "surface", section: "experience", skills: [], isCoreStrength: false, pineconeScore: 0 }]);
    p.stream.mockImplementation(({ onFinish }: { onFinish: (text: string) => void }) => {
      onFinish("Flint answer");
      return { toUIMessageStreamResponse: (opts: { messageMetadata: (event: { part: { type: string } }) => unknown }) =>
        Response.json(opts.messageMetadata({ part: { type: "finish" } })) };
    });
    const { handleChat } = await import("@/lib/server/chat-service");
    const { logExchange } = await import("@/lib/analytics");
    const response = await handleChat(request("Tell me about Flint"), { signal: new AbortController().signal, internal: false });
    expect(await response.json()).toEqual({ sourceTags: ["Flint Technologies"] });
    expect(logExchange).toHaveBeenCalledWith(expect.objectContaining({ chunksUsed: ["exp-flint-overview"] }));
  });
});

describe("SDK response contracts", () => {
  it("returns the init welcome as JSON with the configured token limit", async () => {
    p.generate.mockResolvedValue("Welcome, ask me anything.");
    const init = parseChatRequest({ type: "init", messages: [], lang: "en" });
    const { handleChat } = await import("@/lib/server/chat-service");
    const response = await handleChat(init, { signal: new AbortController().signal, internal: false });
    expect(await response.json()).toEqual({ welcome: "Welcome, ask me anything." });
    expect(p.generate).toHaveBeenCalledWith(expect.objectContaining({ maxOutputTokens: 300 }));
    expect(p.fetch).toHaveBeenCalled();
  });

  it("serializes a clarification as an SDK UI stream with public metadata only", async () => {
    p.rewrite.mockResolvedValue(JSON.stringify({ intent: "ambiguous", query: "unclear", clarifications: ["Which role?"] }));
    const { handleChat } = await import("@/lib/server/chat-service");
    const response = await handleChat(request("What about that?"), { signal: new AbortController().signal, internal: false });
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const wire = await response.text();
    expect(wire).toContain("Which role?");
    expect(wire).toContain('"sourceTags":[]');
    expect(wire).not.toContain('"trace"');
  });
});

describe("prototype orchestration", () => {
  const prototypeRequest = (persona: "developer_partnerships" | "recruiter", focus: "full_stack" | "business_development" = "full_stack") => ({
    query: "Tell me about your work", persona, focus,
    messages: [{ id: "m", role: "user" as const, parts: [{ type: "text" as const, text: "Tell me about your work" }] }],
  });
  const chunk = (id: string, section: string, overrides: Record<string, unknown> = {}) => ({
    id, enrichedText: id, depth: "surface", section, skills: [], isCoreStrength: false, pineconeScore: 0, ...overrides,
  });

  it("keeps the original section ranking even for suppressed and persona-dampened IDs", async () => {
    p.search.mockResolvedValue([
      chunk("interview-q2.1-why-vc", "experience"),
      chunk("another-why-vc", "experience"),
      chunk("ordinary-project", "project"),
    ]);
    p.generate.mockResolvedValue("Answer");
    const { handlePrototypeChat } = await import("@/lib/server/prototype-service");
    const result = await handlePrototypeChat(prototypeRequest("developer_partnerships"), new AbortController().signal);
    expect(result.chunksUsed).toEqual(["interview-q2.1-why-vc", "another-why-vc", "ordinary-project"]);
    expect(p.generate.mock.calls[0][0].system).toContain("interview-q2.1-why-vc");
  });

  it("keeps the original first 15 when core strength and semantic scores differ", async () => {
    const semantic = Array.from({ length: 10 }, (_, index) =>
      chunk(`semantic-${index}`, "experience", { skills: ["partnership management"], pineconeScore: index / 10 }));
    semantic[0].id = "interview-q2.1-why-vc";
    const focused = Array.from({ length: 6 }, (_, index) =>
      chunk(`focused-${index}`, "experience", { skills: ["partnership management"], pineconeScore: 1 - index / 10,
        isCoreStrength: index === 5 }));
    p.search.mockResolvedValueOnce(semantic).mockResolvedValueOnce(focused);
    p.generate.mockResolvedValue("Answer");
    const { handlePrototypeChat } = await import("@/lib/server/prototype-service");
    const result = await handlePrototypeChat(prototypeRequest("developer_partnerships", "business_development"), new AbortController().signal);
    expect(result.chunksUsed).toEqual([
      "interview-q2.1-why-vc", "semantic-1", "semantic-2", "semantic-3", "semantic-4",
      "semantic-5", "semantic-6", "semantic-7", "semantic-8", "semantic-9",
      "focused-0", "focused-1", "focused-2", "focused-3", "focused-4",
    ]);
    expect(p.generate.mock.calls[0][0].system).not.toContain("focused-5");
  });

  it("does not let a high semantic score outrank a stronger section", async () => {
    p.search.mockResolvedValue([
      chunk("experience-low-score", "experience", { pineconeScore: 0.01 }),
      chunk("project-high-score", "project", { pineconeScore: 0.99 }),
    ]);
    p.generate.mockResolvedValue("Answer");
    const { handlePrototypeChat } = await import("@/lib/server/prototype-service");
    const result = await handlePrototypeChat(prototypeRequest("developer_partnerships"), new AbortController().signal);
    expect(result.chunksUsed).toEqual(["experience-low-score", "project-high-score"]);
  });

  it("keeps pinned text when semantic retrieval repeats its ID", async () => {
    const id = "personal-summary";
    const base = { id, depth: "surface", section: "summary", skills: [], isCoreStrength: false, pineconeScore: 0 };
    p.fetch.mockResolvedValue([{ ...base, enrichedText: "Trusted pinned summary" }]);
    p.search.mockResolvedValue([{ ...base, enrichedText: "Stale semantic summary", pineconeScore: 0.9 }]);
    p.generate.mockResolvedValue("Answer");
    const { handlePrototypeChat } = await import("@/lib/server/prototype-service");
    const result = await handlePrototypeChat({ query: "Tell me about yourself", persona: "vc", focus: "full_stack",
      messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "Tell me about yourself" }] }] }, new AbortController().signal);
    expect(result).toEqual({ response: "Answer", chunksUsed: [id] });
    expect(p.generate).toHaveBeenCalledWith(expect.objectContaining({ system: expect.stringContaining("Trusted pinned summary") }));
    expect(p.generate.mock.calls[0][0].system).not.toContain("Stale semantic summary");
  });
});
