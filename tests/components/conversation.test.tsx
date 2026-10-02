// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useProfileConversation } from "@/hooks/useProfileConversation";
import FeedbackButtons from "@/components/FeedbackButtons";
import LegacyChat from "@/app/v1/page";
import { useTheme } from "@/hooks/useTheme";
import { useAutoScroll } from "@/hooks/useAutoScroll";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const options = { lang: "en" as const, persona: "vc" as const };
const stream = () => new Response('data: {"type":"start","messageId":"a1"}\n\ndata: {"type":"text-start","id":"t1"}\n\ndata: {"type":"text-delta","id":"t1","delta":"Late answer"}\n\ndata: {"type":"text-end","id":"t1"}\n\ndata: {"type":"finish"}\n\n', { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } });

it("reset aborts and isolates a delayed SDK stream, history, error, and trace", async () => {
  let deliver!: (response: Response) => void;
  const fetcher = vi.fn((url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((resolve) => {
    expect(url).toBe("/api/chat");
    expect(init?.signal).toBeDefined();
    deliver = resolve;
  }));
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useProfileConversation(options));
  act(() => result.current.send("Hello"));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  const sent = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  expect(sent.messages[0].parts).toEqual([{ type: "text", text: "Hello" }]);
  expect(sent.visitorData).toEqual({ persona: "vc", focus: "full_stack" });
  expect(sent.lang).toBe("en");
  act(() => result.current.selectTrace("old-trace"));
  act(() => result.current.reset());
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(result.current.messages).toEqual([]);
  expect(result.current.selectedTraceMessageId).toBeNull();
  expect(result.current.error).toBeUndefined();
  await act(async () => { deliver(stream()); await Promise.resolve(); });
  expect(result.current.messages).toEqual([]);
});

it("reset removes a visible partial answer and ignores later chunks from its stream", async () => {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let requestSignal!: AbortSignal;
  const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = init?.signal as AbortSignal;
    return Promise.resolve(new Response(new ReadableStream<Uint8Array>({
      start(streamController) { controller = streamController; },
    }), { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } }));
  });
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useProfileConversation(options));
  act(() => result.current.send("Hello"));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await act(async () => {
    controller.enqueue(encoder.encode('data: {"type":"start","messageId":"partial"}\n\ndata: {"type":"text-start","id":"part"}\n\ndata: {"type":"text-delta","id":"part","delta":"First chunk"}\n\n'));
  });
  await waitFor(() => expect(result.current.messages.some((message) =>
    message.role === "assistant" && message.parts.some((part) => part.type === "text" && part.text.includes("First chunk")))).toBe(true));
  act(() => result.current.reset());
  expect(requestSignal.aborted).toBe(true);
  expect(result.current.messages).toEqual([]);
  await act(async () => {
    try {
      controller.enqueue(encoder.encode('data: {"type":"text-delta","id":"part","delta":"Late chunk"}\n\ndata: {"type":"text-end","id":"part"}\n\ndata: {"type":"finish"}\n\n'));
      controller.close();
    } catch { /* Aborted readers may cancel the stream before this write. */ }
    await Promise.resolve();
  });
  expect(result.current.messages).toEqual([]);
});

it("reset clears a real SDK error and permits a new request", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const fetcher = vi.fn().mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce(stream());
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useProfileConversation(options));
  act(() => result.current.send("First"));
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current.error?.message).toContain("network unavailable");
  act(() => result.current.reset());
  expect(result.current.messages).toEqual([]);
  expect(result.current.error).toBeUndefined();
  act(() => result.current.send("Second"));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
});

it("failed feedback stays retryable and only success selects it", async () => {
  const onFeedback = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  render(<FeedbackButtons messageId="a1" onFeedback={onFeedback} />);
  fireEvent.click(screen.getByRole("button", { name: "Thumbs up" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Thumbs up" })).toBeEnabled());
  expect(screen.getByRole("alert")).toHaveTextContent(/try again/i);
  fireEvent.click(screen.getByRole("button", { name: "Thumbs up" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Thumbs up" })).toBeDisabled());
  expect(onFeedback).toHaveBeenCalledTimes(2);
});

it("rejects unsuccessful feedback HTTP responses and tolerates blocked theme storage", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
  const { result: conversation } = renderHook(() => useProfileConversation(options));
  await expect(conversation.current.submitFeedback("a1", "up")).rejects.toThrow("503");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const { result: theme } = renderHook(() => useTheme());
  act(() => theme.current.toggleDarkMode());
  expect(theme.current.darkMode).toBe(true);
  document.documentElement.classList.remove("dark");
});

it("scrolls new answers only while the reader is near the bottom", () => {
  function Scroller({ version }: { version: number }) {
    const { scrollRef, onScroll } = useAutoScroll(version, "streaming");
    return <div ref={scrollRef} onScroll={onScroll} data-testid="scroll" />;
  }
  const { rerender } = render(<Scroller version={0} />);
  const el = screen.getByTestId("scroll");
  Object.defineProperty(el, "scrollHeight", { value: 500 });
  Object.defineProperty(el, "clientHeight", { value: 100 });
  el.scrollTop = 0;
  fireEvent.scroll(el);
  rerender(<Scroller version={1} />);
  expect(el.scrollTop).toBe(0);
  el.scrollTop = 395;
  fireEvent.scroll(el);
  rerender(<Scroller version={2} />);
  expect(el.scrollTop).toBe(500);
});

async function startLegacy() {
  fireEvent.click(screen.getByRole("radio", { name: "Recruiter" }));
  fireEvent.click(screen.getByRole("radio", { name: "Business Development" }));
  fireEvent.click(screen.getByRole("button", { name: /Start Chat/i }));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Start Chat/i })).not.toBeInTheDocument());
}

it("late legacy welcome cannot replace a user message or reset", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  let resolveWelcome!: (response: Response) => void;
  const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    return body.type === "init" ? new Promise<Response>((resolve) => { resolveWelcome = resolve; }) : Promise.resolve(stream());
  });
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<LegacyChat />);
  await startLegacy();
  fireEvent.change(screen.getByPlaceholderText("Ask about my experience..."), { target: { value: "My question" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("My question");
  await act(async () => { resolveWelcome(Response.json({ welcome: "Stale welcome" })); });
  expect(screen.queryByText("Stale welcome")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Reset settings"));
  await act(async () => { await Promise.resolve(); });
  expect(screen.queryByText("My question")).not.toBeInTheDocument();
});

it("legacy non-2xx welcome uses the static fallback", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("unavailable", { status: 503 })));
  render(<LegacyChat />);
  await startLegacy();
  expect(await screen.findByText(/Feel free to ask anything!/i)).toBeInTheDocument();
});

it("legacy welcome retries after a failed initialization and ignores the earlier reply", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  let resolveOld!: (response: Response) => void;
  const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (body.type !== "init") return Promise.resolve(stream());
    if (!resolveOld) return new Promise<Response>((resolve) => { resolveOld = resolve; });
    return Promise.resolve(Response.json({ welcome: "New welcome" }));
  });
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<LegacyChat />);
  await startLegacy();
  fireEvent.click(screen.getByTitle("Reset settings"));
  await startLegacy();
  expect(await screen.findByText("New welcome")).toBeInTheDocument();
  await act(async () => { resolveOld(Response.json({ welcome: "Old welcome" })); });
  expect(screen.queryByText("Old welcome")).not.toBeInTheDocument();
});
