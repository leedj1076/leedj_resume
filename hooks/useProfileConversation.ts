"use client";

import { useCallback, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { adminTransportFetch } from "@/lib/admin/client";
import { toApiLanguage, type Language } from "@/lib/domain/language";
import type { Persona, PersonaLabel } from "@/lib/domain/personas";
import type { ChatUIMessage } from "@/lib/types";

export interface ProfileAppProps {
  internal?: boolean;
  visiblePersonas?: string[];
  personaLabels?: Record<string, PersonaLabel>;
  source?: string;
  defaultPersona?: string;
}

export function useProfileConversation(options: ProfileAppProps & { lang: Language; persona: Persona; visitorEmail?: string }) {
  const { internal, lang, persona, source, visitorEmail } = options;
  const [sessionId] = useState(() => crypto.randomUUID());
  const [generation, setGeneration] = useState(0);
  const [selectedTraceMessageId, selectTrace] = useState<string | null>(null);
  const transport = useMemo(() => new DefaultChatTransport<ChatUIMessage>({
    api: "/api/chat",
    credentials: "same-origin",
    fetch: internal ? adminTransportFetch : undefined,
  }), [internal]);
  // An SDK chat is scoped to its id. Replacing the id on reset isolates any
  // transport that resolves after an abort and ignores AbortSignal.
  const { messages, sendMessage, stop: sdkStop, status, error } = useChat<ChatUIMessage>({
    id: `${sessionId}-${generation}`,
    transport,
    onError: (err) => console.error("Chat error:", err),
  });

  const send = useCallback((text: string) => {
    const normalized = text.trim();
    if (!normalized || status === "submitted" || status === "streaming") return;
    const coveredTopics = [...new Set(messages
      .filter((message) => message.role === "assistant")
      .flatMap((message) => message.metadata?.sourceTags ?? []))].slice(-30);
    void sendMessage({ text: normalized }, { body: {
      visitorData: { persona, focus: "full_stack" },
      sessionId,
      lang: toApiLanguage(lang),
      coveredTopics,
      visitorEmail,
      source,
      ...(internal ? { internal: true } : {}),
    } });
  }, [internal, lang, messages, persona, sendMessage, sessionId, source, status, visitorEmail]);

  const stop = useCallback(() => { void sdkStop(); }, [sdkStop]);
  const reset = useCallback(() => {
    void sdkStop();
    selectTrace(null);
    setGeneration((current) => current + 1);
  }, [sdkStop]);
  const submitFeedback = useCallback(async (messageId: string, value: "up" | "down") => {
    const request = internal ? adminTransportFetch : fetch;
    const response = await request("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId, value, persona, focus: "full_stack", sessionId,
        ...(internal ? { internal: true } : {}),
      }),
    });
    if (!response.ok) throw new Error(`Feedback failed (${response.status})`);
  }, [internal, persona, sessionId]);

  const latestTraceMessageId = internal
    ? [...messages].reverse().find((message) => message.role === "assistant" && message.metadata?.trace)?.id ?? null
    : null;
  const activeTraceMessageId = selectedTraceMessageId && messages.some((message) => message.id === selectedTraceMessageId)
    ? selectedTraceMessageId : latestTraceMessageId;
  const selectedTrace = internal
    ? messages.find((message) => message.id === activeTraceMessageId)?.metadata?.trace ?? null
    : null;

  return { messages, status, error, selectedTrace, selectedTraceMessageId,
    activeTraceMessageId, sessionId, send, stop, reset, selectTrace, submitFeedback };
}
