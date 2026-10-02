import type { Focus, Persona, VisitorData } from "../domain/personas";
import { resolveVisitor } from "../domain/personas";
import { HttpError } from "./http";

export type NormalizedMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};
type ChatFields = {
  messages: NormalizedMessage[];
  visitorData: VisitorData;
  lang: "en" | "ko";
  sessionId?: string;
  coveredTopics: string[];
  visitorEmail?: string;
  internal: boolean;
  source?: string;
};
export type ChatRequest =
  (ChatFields & { type: "init" }) | (ChatFields & { type: "chat" });
export type PrototypeRequest = {
  query: string;
  persona: Persona;
  focus: Focus;
  messages: NormalizedMessage[];
};

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_request", "Invalid request body");
  }
  return value as Record<string, unknown>;
}

function optionalString(
  value: unknown,
  name: string,
  max: number,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > max) {
    throw new HttpError(400, "invalid_request", `Invalid ${name}`);
  }
  return value;
}

function normalizeMessages(
  raw: unknown,
  allowEmpty: boolean,
): NormalizedMessage[] {
  if (!Array.isArray(raw))
    throw new HttpError(400, "invalid_messages", "Invalid messages");
  if (raw.length > 50)
    throw new HttpError(413, "too_many_messages", "Too many messages");
  if (!allowEmpty && raw.length === 0)
    throw new HttpError(400, "invalid_messages", "A user message is required");
  let total = 0;
  const messages = raw.map((entry, index) => {
    const message = object(entry);
    if (message.role !== "user" && message.role !== "assistant") {
      throw new HttpError(
        400,
        "invalid_messages",
        "Only user and assistant messages are supported",
      );
    }
    if (message.content !== undefined && message.parts !== undefined) {
      throw new HttpError(
        400,
        "invalid_messages",
        "Use one message content format",
      );
    }
    let text: string;
    if (message.parts !== undefined) {
      if (!Array.isArray(message.parts))
        throw new HttpError(400, "invalid_messages", "Invalid message parts");
      const texts: string[] = [];
      for (const partValue of message.parts) {
        const part = object(partValue);
        if (part.type === "step-start" && Object.keys(part).length === 1)
          continue;
        if (part.type !== "text" || typeof part.text !== "string") {
          throw new HttpError(
            400,
            "unsupported_content",
            "Unsupported message content",
          );
        }
        texts.push(part.text);
      }
      text = texts.join("");
    } else if (typeof message.content === "string") {
      text = message.content;
    } else {
      throw new HttpError(400, "invalid_messages", "Invalid message text");
    }
    if (!text.trim())
      throw new HttpError(400, "invalid_messages", "Empty message");
    const limit = message.role === "user" ? 2_000 : 16_000;
    if (text.length > limit)
      throw new HttpError(413, "message_too_large", "Message is too long");
    total += text.length;
    if (total > 40_000)
      throw new HttpError(
        413,
        "conversation_too_large",
        "Conversation is too long",
      );
    return {
      id: `message-${index}`,
      role: message.role as "user" | "assistant",
      parts: [{ type: "text" as const, text }],
    };
  });
  if (messages.length && messages.at(-1)?.role !== "user") {
    throw new HttpError(
      400,
      "invalid_messages",
      "Final message must be from the user",
    );
  }
  return messages;
}

export function parseChatRequest(raw: unknown): ChatRequest {
  const body = object(raw);
  const type = body.type === undefined ? "chat" : body.type;
  if (type !== "init" && type !== "chat")
    throw new HttpError(400, "invalid_request", "Invalid request type");
  const messages = normalizeMessages(
    body.messages ?? (type === "init" ? [] : undefined),
    type === "init",
  );
  if (type === "init" && messages.length)
    throw new HttpError(400, "invalid_messages", "Init must have no messages");
  const lang = body.lang === undefined ? "en" : body.lang;
  if (lang !== "en" && lang !== "ko")
    throw new HttpError(400, "invalid_request", "Invalid lang");
  if (body.internal !== undefined && typeof body.internal !== "boolean")
    throw new HttpError(400, "invalid_request", "Invalid internal");
  const coveredTopics = body.coveredTopics ?? [];
  if (
    !Array.isArray(coveredTopics) ||
    coveredTopics.length > 30 ||
    coveredTopics.some(
      (topic) => typeof topic !== "string" || topic.length > 100,
    )
  ) {
    throw new HttpError(400, "invalid_request", "Invalid coveredTopics");
  }
  return {
    type,
    messages,
    visitorData: resolveVisitor(body.visitorData),
    lang,
    sessionId: optionalString(body.sessionId, "sessionId", 128),
    coveredTopics,
    visitorEmail: optionalString(body.visitorEmail, "visitorEmail", 254),
    internal: body.internal === true,
    source: optionalString(body.source, "source", 100),
  };
}

export function parsePrototypeRequest(raw: unknown): PrototypeRequest {
  const body = object(raw);
  if (typeof body.query !== "string" || !body.query.trim())
    throw new HttpError(400, "invalid_request", "Empty query");
  const history = body.history ?? [];
  if (!Array.isArray(history))
    throw new HttpError(400, "invalid_messages", "Invalid history");
  const messages = normalizeMessages(
    [
      ...history.map((item) => {
        const entry = object(item);
        return { role: entry.role, content: entry.text };
      }),
      { role: "user", content: body.query },
    ],
    false,
  );
  const visitor = resolveVisitor({
    persona: body.personaId,
    focus: body.focusId,
  });
  return {
    query: body.query,
    persona: visitor.persona,
    focus: visitor.focus,
    messages,
  };
}

export function parseCaptureMessages(raw: unknown): NormalizedMessage[] {
  return normalizeMessages(raw, true);
}
