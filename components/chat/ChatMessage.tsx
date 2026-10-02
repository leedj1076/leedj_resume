"use client";

import Markdown from "react-markdown";
import FeedbackButtons from "@/components/FeedbackButtons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getMessageText, parseFollowUps } from "@/lib/chat/messages";
import type { ChatUIMessage } from "@/lib/types";

interface ChatMessageProps {
  m: ChatUIMessage;
  status: "ready" | "submitted" | "streaming" | "error";
  lastMessageId?: string;
  internal?: boolean;
  selectedTraceMessageId?: string | null;
  onSelectTrace?: (id: string) => void;
  onFeedback: (id: string, value: "up" | "down") => Promise<void> | void;
}

export default function ChatMessage({
  m,
  status,
  lastMessageId,
  internal,
  selectedTraceMessageId,
  onSelectTrace,
  onFeedback,
}: ChatMessageProps) {
  const rawText = getMessageText(m);
  const isAssistant = m.role === "assistant";
  const { clean: text } = isAssistant
    ? parseFollowUps(rawText)
    : { clean: rawText };
  return (
    <div className="mb-3 animate-[slideUp_0.25s_ease-out]">
      {m.role === "user" ? (
        <div className="flex justify-end items-start gap-2">
          <div className="max-w-[80%] px-3.5 py-2.5 rounded-[12px_12px_4px_12px] bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] text-[14px] leading-relaxed">
            {text}
          </div>
          <Avatar size="sm" className="mt-0.5">
            <AvatarFallback className="bg-[var(--color-avatar-user-bg)] text-[var(--color-avatar-user-text)]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <>
          <div className="flex justify-start items-start gap-2">
            <Avatar size="sm" className="mt-0.5">
              <AvatarFallback className="bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] text-[10px] font-semibold">
                DJ
              </AvatarFallback>
            </Avatar>
            <div className="max-w-[85%] px-4 py-3 rounded-[12px_12px_12px_4px] bg-[var(--color-surface-tertiary)] border border-[var(--color-border-primary)]">
              <div className="prose prose-sm dark:prose-invert max-w-none text-[14px] text-[var(--color-text-primary)] leading-[1.7] prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-li:text-[var(--color-text-primary)] prose-strong:text-[var(--color-text-primary)] prose-strong:font-semibold prose-headings:text-[15px] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-[var(--color-text-primary)] prose-a:text-[var(--color-key)]">
                <Markdown>{text}</Markdown>
              </div>
              {status === "streaming" && m.id === lastMessageId && rawText && (
                <span className="inline-block w-0.5 h-[13px] bg-[var(--color-text-primary)] ml-0.5 animate-pulse align-text-bottom" />
              )}
            </div>
          </div>
          <div className="flex justify-start items-center gap-2 ml-8">
            <FeedbackButtons messageId={m.id} onFeedback={onFeedback} />
            {m.metadata?.sourceTags && m.metadata.sourceTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.metadata.sourceTags.map((tag, ti) => (
                  <Badge
                    key={ti}
                    variant="secondary"
                    className="text-[11px] px-1.5 py-0.5 bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border-primary)]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {internal && m.metadata?.trace && onSelectTrace && (
              <button
                onClick={() => onSelectTrace(m.id)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  selectedTraceMessageId === m.id
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    : "bg-gray-100 text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
                }`}
                title="View RAG trace"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                trace
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
