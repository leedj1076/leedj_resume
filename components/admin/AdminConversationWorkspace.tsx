"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ChatUIMessage } from "@/lib/types";
import { AdminGate } from "./AdminGate";

interface ConversationSnapshot {
  messages: ChatUIMessage[];
  draft: string;
  sessionId?: string;
}
function createMemory() {
  let snapshot: ConversationSnapshot = { messages: [], draft: "" };
  return {
    read: (): Readonly<ConversationSnapshot> => snapshot,
    saveMessages(messages: ChatUIMessage[]) {
      snapshot = { ...snapshot, messages: retainMessages(messages) };
    },
    saveDraft(draft: string) {
      snapshot = { ...snapshot, draft: draft.slice(0, 2_000) };
    },
    saveSessionId(sessionId: string) {
      snapshot = { ...snapshot, sessionId };
    },
  };
}
const MemoryContext = createContext<ReturnType<typeof createMemory> | null>(
  null,
);

/** Retain only a bounded snapshot while the protected UI is unmounted.
 * Replacing this object on logout also detaches any stale callback's writes.
 */
export function AdminConversationWorkspace({
  children,
}: {
  children: ReactNode;
}) {
  const [memory, setMemory] = useState(createMemory);
  return (
    <MemoryContext.Provider value={memory}>
      <AdminGate onSignedOut={() => setMemory(createMemory())}>
        {children}
      </AdminGate>
    </MemoryContext.Provider>
  );
}
export function useConversationMemory() {
  return useContext(MemoryContext);
}

export function retainMessages(messages: ChatUIMessage[]): ChatUIMessage[] {
  let remaining = 500_000;
  const retained: ChatUIMessage[] = [];
  for (const message of messages.slice(-50).toReversed()) {
    const serialized = JSON.stringify(message);
    if (serialized.length > remaining) break;
    remaining -= serialized.length;
    // Isolate the snapshot from later SDK mutations on a detached chat.
    retained.unshift(JSON.parse(serialized) as ChatUIMessage);
  }
  return retained;
}

export function useConversationDraft() {
  const memory = useConversationMemory();
  const [draft, setDraft] = useState(() => memory?.read().draft ?? "");
  const updateDraft = (value: string) => {
    const bounded = memory ? value.slice(0, 2_000) : value;
    memory?.saveDraft(bounded);
    setDraft(bounded);
  };
  return [draft, updateDraft] as const;
}
