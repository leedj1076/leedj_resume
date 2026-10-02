import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatPanel from "@/components/ChatPanel";
import type { ChatUIMessage } from "@/lib/types";

const exportPdf = vi.fn();
vi.mock("@/lib/chat/export-pdf", () => ({ exportConversation: exportPdf }));

afterEach(() => { cleanup(); exportPdf.mockReset(); });

const messages = [
  { id: "q", role: "user", parts: [{ type: "text", text: "Question" }] } as ChatUIMessage,
];

function panel(status: "ready" | "streaming") {
  return <ChatPanel lang="en" persona="general" messages={messages} status={status}
    onSend={vi.fn()} onStop={vi.fn()} onReset={vi.fn()} onFeedback={vi.fn()}
    starterIndices={[]} />;
}

it("disables export while the conversation is streaming", () => {
  render(panel("streaming"));
  expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
});

it("shows PDF errors and permits a retry", async () => {
  exportPdf.mockRejectedValueOnce(new Error("font unavailable")).mockResolvedValueOnce(undefined);
  render(panel("ready"));
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("font unavailable");
  const button = screen.getByRole("button", { name: "Export" });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(exportPdf).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
