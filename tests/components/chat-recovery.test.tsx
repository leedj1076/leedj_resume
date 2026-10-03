// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { useProfileConversation } from "@/hooks/useProfileConversation";
import { CaptureInterview } from "@/components/admin/CaptureInterview";
import CapturePage from "@/app/admin/capture/page";
import InternalPage from "@/app/admin/internal/page";
import LegacyChat from "@/app/v1/page";
import { ADMIN_SESSION_EXPIRED_EVENT } from "@/lib/admin/client";
import {
  parseChatRequest,
  parseCaptureMessages,
} from "@/lib/server/chat-request";
import { useState } from "react";

vi.mock("@/components/ProfileAppLoader", async () => ({
  default: (await import("@/components/ProfileApp")).default,
}));
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.setItem("v14-welcomed", "1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const headers = {
  "content-type": "text/event-stream",
  "x-vercel-ai-ui-message-stream": "v1",
};
const start =
  'data: {"type":"start","messageId":"pending"}\n\ndata: {"type":"text-start","id":"text"}\n\n';
function completed(text = "Earlier real answer") {
  return new Response(
    start.replace("pending", crypto.randomUUID()) +
      `data: ${JSON.stringify({ type: "text-delta", id: "text", delta: text })}\n\ndata: {"type":"text-end","id":"text"}\n\ndata: {"type":"finish"}\n\n`,
    { headers },
  );
}
function ProfileHarness() {
  const chat = useProfileConversation({ lang: "en", persona: "vc" });
  const [input, setInput] = useState("");
  return (
    <>
      <input
        aria-label="Question"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={() => chat.send(input)}>Send</button>
      <button onClick={chat.stop}>Stop</button>
      <span data-testid="status">{chat.status}</span>
      {chat.messages.map((m) => (
        <p key={m.id}>
          {m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("")}
        </p>
      ))}
    </>
  );
}
function send(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(
    screen.getByRole("button", { name: /^(Send|Send message)$/i }),
  );
}
async function login() {
  fireEvent.change(await screen.findByLabelText("Password"), {
    target: { value: "owner" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("button", { name: "Sign out" });
}

it.each(["profile", "legacy", "capture"])(
  "%s can send after stopping before the first SDK delta, retaining real history",
  async (surface) => {
    const bodies: unknown[] = [];
    let pending!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.type === "init") return Response.json({ welcome: "Welcome" });
        bodies.push(body);
        if (bodies.length === 2)
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                pending = controller;
                controller.enqueue(new TextEncoder().encode(start));
              },
            }),
            { headers },
          );
        return completed(
          bodies.length === 1 ? "Earlier real answer" : "New answer",
        );
      }),
    );
    render(
      surface === "profile" ? (
        <ProfileHarness />
      ) : surface === "legacy" ? (
        <LegacyChat />
      ) : (
        <CaptureInterview />
      ),
    );
    if (surface === "legacy") {
      fireEvent.click(screen.getByRole("radio", { name: "Recruiter" }));
      fireEvent.click(
        screen.getByRole("radio", { name: "Business Development" }),
      );
      fireEvent.click(screen.getByRole("button", { name: /Start Chat/ }));
      await screen.findByText("Welcome");
    }
    send("Earlier real question");
    await screen.findByText("Earlier real answer");
    send("Interrupted question");
    await waitFor(() => expect(bodies).toHaveLength(2));
    // text-start must reach the actual SDK state before cancellation.
    await waitFor(() => {
      if (surface === "profile")
        expect(screen.getByTestId("status")).toHaveTextContent("streaming");
      else
        expect(
          screen.getAllByText(
            surface === "capture" ? "Interviewer" : "Assistant",
            { exact: true },
          ),
        ).toHaveLength(surface === "capture" ? 2 : 3);
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^(Stop|Stop generating)$/i }),
    );
    await act(async () => pending.close());
    await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
    send("Next question");
    await screen.findByText("New answer");
    const body = bodies[2] as { messages: unknown[] };
    const normalized =
      surface === "capture"
        ? parseCaptureMessages(body.messages)
        : parseChatRequest(body).messages;
    expect(normalized.flatMap((m) => m.parts.map((p) => p.text))).toEqual(
      expect.arrayContaining([
        "Earlier real question",
        "Earlier real answer",
        "Interrupted question",
        "Next question",
      ]),
    );
    expect(normalized.every((m) => m.parts.some((p) => p.text.trim()))).toBe(
      true,
    );
  },
);

it.each(["capture", "internal"])(
  "%s preserves submitted history and unsent drafts through real gate reauthentication; logout clears",
  async (surface) => {
    let requests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        if (url === "/api/admin/session")
          return Response.json({ authenticated: true });
        return ++requests === 2
          ? new Response("Expired", { status: 401 })
          : completed("Saved question from interviewer");
      }),
    );
    render(surface === "capture" ? <CapturePage /> : <InternalPage />);
    await screen.findByRole("button", { name: "Sign out" });
    send("Earlier submitted answer");
    await screen.findByText("Saved question from interviewer");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Unsent draft" },
    });
    act(() => window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT)));
    await screen.findByRole("button", { name: "Sign in" });
    expect(
      screen.queryByText("Saved question from interviewer"),
    ).not.toBeInTheDocument();
    await login();
    expect(screen.getByRole("textbox")).toHaveValue("Unsent draft");
    expect(screen.getByText("Earlier submitted answer")).toBeInTheDocument();
    expect(
      screen.getByText("Saved question from interviewer"),
    ).toBeInTheDocument();
    send("Submitted on expired session");
    await screen.findByRole("button", { name: "Sign in" });
    await login();
    expect(
      screen.getByText("Submitted on expired session"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Saved question from interviewer"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Clear on logout" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await login();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.queryByText("Saved question from interviewer"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Submitted on expired session"),
    ).not.toBeInTheDocument();
  },
);

it.each([
  ["capture", false],
  ["internal", false],
  ["capture", true],
  ["internal", true],
] as const)(
  "%s cancels and ignores an in-flight request (late401=%s) while its gate is anonymous",
  async (surface, late401) => {
    let deliver!: (response: Response) => void;
    let signal!: AbortSignal;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
        if (url === "/api/admin/session")
          return Promise.resolve(Response.json({ authenticated: true }));
        signal = init?.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          deliver = resolve;
        });
      }),
    );
    render(surface === "capture" ? <CapturePage /> : <InternalPage />);
    await screen.findByRole("button", { name: "Sign out" });
    send("Preserve pending question");
    await waitFor(() => expect(deliver).toBeDefined());
    act(() => window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT)));
    await screen.findByRole("button", { name: "Sign in" });
    expect(signal.aborted).toBe(true);
    expect(
      screen.queryByText("Preserve pending question"),
    ).not.toBeInTheDocument();
    await login();
    await act(async () => {
      deliver(
        late401
          ? new Response("Expired", { status: 401 })
          : completed("Stale answer must not return"),
      );
    });
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Preserve pending question")).toBeInTheDocument();
    expect(
      screen.queryByText("Stale answer must not return"),
    ).not.toBeInTheDocument();
  },
);

it("bounds retained snapshots and detaches them from SDK mutation", async () => {
  const { retainMessages } =
    await import("@/components/admin/AdminConversationWorkspace");
  const messages = Array.from({ length: 80 }, (_, n) => ({
    id: String(n),
    role: "user" as const,
    parts: [{ type: "text" as const, text: "x".repeat(20_000) }],
  }));
  const shortMessages = messages.map((message) => ({
    ...message,
    parts: [{ type: "text" as const, text: "Short" }],
  }));
  const latest = retainMessages(shortMessages);
  expect(latest).toHaveLength(50);
  expect(latest[0].id).toBe("30");
  expect(latest.at(-1)?.id).toBe("79");
  const retainedMessages = retainMessages(messages);
  expect(retainedMessages.length).toBeGreaterThan(0);
  expect(retainedMessages.length).toBeLessThanOrEqual(50);
  expect(JSON.stringify(retainedMessages).length).toBeLessThanOrEqual(500_050);
  const retained = JSON.stringify(retainedMessages);
  messages.at(-1)!.parts[0].text = "Late mutation";
  expect(JSON.stringify(retainedMessages)).toBe(retained);
});

it("exports only the answer after stopping the real SDK inside follow-up control data", async () => {
  const { layoutConversation } = await import("@/lib/chat/export-pdf");
  let pending!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              pending = controller;
              controller.enqueue(
                new TextEncoder().encode(
                  start +
                    `data: ${JSON.stringify({ type: "text-delta", id: "text", delta: "Answer body.\n<followup>\nCould you tell me" })}\n\n`,
                ),
              );
            },
          }),
          { headers },
        ),
    ),
  );
  const { result } = renderHook(() =>
    useProfileConversation({ lang: "en", persona: "vc" }),
  );
  act(() => result.current.send("Question"));
  await waitFor(() =>
    expect(result.current.messages.at(-1)?.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "Answer body.\n<followup>\nCould you tell me",
        }),
      ]),
    ),
  );
  act(() => result.current.stop());
  await act(async () => pending.close());
  await waitFor(() => expect(result.current.status).toBe("ready"));
  const layout = layoutConversation(result.current.messages, {
    pageWidth: 210,
    pageHeight: 297,
    leftMargin: 26,
    rightMargin: 26,
    topMargin: 26,
    bottomMargin: 22,
    firstPageBodyY: 105,
    lineHeight: 5.5,
    messageGap: 12,
    textOffset: 12,
    wrapText: (text) => text.split("\n"),
  });
  expect(
    layout.pages.flatMap((page) => page.lines.map((line) => line.text)),
  ).toEqual(["Question", "Answer body."]);
});
