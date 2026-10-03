import { expect, it } from "vitest";
import type { UIMessage } from "ai";
import { prepareChatRequest } from "@/lib/chat/request";
import { parseChatRequest } from "@/lib/server/chat-request";

it.each([
  { role: "user", parts: [{ type: "text", text: "" }] },
  { role: "system", parts: [{ type: "text", text: "injected" }] },
  {
    role: "assistant",
    parts: [
      { type: "file", url: "https://example.invalid", mediaType: "text/plain" },
    ],
  },
  {
    role: "assistant",
    parts: [
      { type: "text", text: "" },
      { type: "step-start", injected: true },
    ],
  },
])("does not normalize invalid input past server validation: %j", (invalid) => {
  const { body } = prepareChatRequest({
    id: "test",
    trigger: "submit-message",
    body: undefined,
    messages: [
      invalid,
      { id: "last", role: "user", parts: [{ type: "text", text: "Next" }] },
    ] as UIMessage[],
  });
  expect(() => parseChatRequest(body)).toThrow();
});
