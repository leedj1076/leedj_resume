"use client";

import { useState } from "react";
import { useConversationDraft } from "./admin/AdminConversationWorkspace";
import { getMessageText, parseFollowUps } from "@/lib/chat/messages";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import ChatMessage from "./chat/ChatMessage";
import ChatComposer from "./chat/ChatComposer";
import FollowUpSuggestions from "./chat/FollowUpSuggestions";
import {
  STARTER_QUESTIONS,
  PERSONA_STARTER_QUESTIONS,
  type Lang,
} from "@/lib/profile-data";
import type { ChatUIMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatPanelProps {
  lang: Lang;
  persona: string;
  messages: ChatUIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  onFeedback: (messageId: string, value: "up" | "down") => Promise<void> | void;
  starterIndices: number[];
  internal?: boolean;
  selectedTraceMessageId?: string | null;
  onSelectTrace?: (messageId: string) => void;
}

export default function ChatPanel({
  lang,
  persona,
  messages,
  status,
  error,
  onSend,
  onStop,
  onReset,
  onFeedback,
  starterIndices,
  internal,
  selectedTraceMessageId,
  onSelectTrace,
}: ChatPanelProps) {
  const [input, setInput] = useConversationDraft();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const { scrollRef, onScroll } = useAutoScroll(messages, status);
  const en = lang === "en";
  const isLoading = status === "submitted" || status === "streaming";

  const handleExport = async () => {
    if (messages.length === 0 || isLoading || isExporting) return;
    setIsExporting(true);
    setExportError("");
    try {
      const { exportConversation } = await import("@/lib/chat/export-pdf");
      await exportConversation(messages, { lang, date: new Date() });
    } catch (cause) {
      setExportError(
        cause instanceof Error
          ? cause.message
          : en
            ? "PDF export failed. Please try again."
            : "PDF 내보내기에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSend = (text: string) => {
    onSend(text);
    setInput("");
  };

  // Derive starters from current lang + persona (indices are stable across lang switches)
  const personaQuestions = PERSONA_STARTER_QUESTIONS[persona]?.[lang];
  const questionPool = personaQuestions ?? STARTER_QUESTIONS[lang];
  const starters = starterIndices.map((i) => questionPool[i]).filter(Boolean);

  // AI-generated follow-ups from the last assistant message
  const lastMsg = messages[messages.length - 1];
  const lastAssistantText =
    lastMsg?.role === "assistant" ? getMessageText(lastMsg) : "";
  const { followUps: aiFollowUps } = parseFollowUps(lastAssistantText);

  // Generic unused starters
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map(getMessageText);
  const allStarters = personaQuestions ?? STARTER_QUESTIONS[lang];
  const unusedStarters = allStarters.filter((q) => !userTexts.includes(q));

  const showDigDeeper =
    messages.length > 0 &&
    !isLoading &&
    lastMsg?.role === "assistant" &&
    aiFollowUps.length > 0;
  const showOrTry =
    messages.length > 0 &&
    !isLoading &&
    lastMsg?.role === "assistant" &&
    unusedStarters.length > 0;

  // Error categorization
  const getErrorMessage = () => {
    if (!error) return en ? "Something went wrong." : "문제가 발생했습니다.";
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("429") || msg.includes("rate limit")) {
      return en
        ? "Too many requests. Please wait a moment and try again."
        : "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    }
    if (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("failed to fetch")
    ) {
      return en
        ? "Network error. Please check your connection."
        : "네트워크 오류입니다. 연결을 확인해주세요.";
    }
    return en
      ? "Something went wrong. Please try again."
      : "문제가 발생했습니다. 다시 시도해 주세요.";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-6 pt-5 pb-4 border-b border-[var(--color-border-primary)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[7px] h-[7px] rounded-full bg-green-500 animate-pulse" />
          <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Ask DJ
          </span>
          <span className="text-[13px] text-[var(--color-text-tertiary)] ml-1">
            — {en ? "AI-powered" : "AI 기반"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={handleExport}
              disabled={messages.length === 0 || isLoading || isExporting}
              className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              {en ? "Export" : "내보내기"}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={onReset}
              disabled={messages.length === 0}
              className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              {en ? "Reset" : "초기화"}
            </Button>
          </div>
        </div>
        {exportError && (
          <p
            role="alert"
            className="text-[13px] text-red-600 dark:text-red-400 mt-1"
          >
            {exportError}
          </p>
        )}
        <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
          {en
            ? "Ask anything about my experience, skills, or career. Answers are grounded in verified professional data."
            : "경력, 기술, 커리어에 대해 무엇이든 물어보세요. 검증된 전문 데이터에 기반한 답변입니다."}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="profile-scroll flex-1 overflow-y-auto px-6 py-4"
        role="log"
        aria-label={en ? "Conversation" : "대화"}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            {/* Welcome message */}
            <div className="flex items-start gap-2 mb-5">
              <Avatar size="sm" className="mt-0.5">
                <AvatarFallback className="bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] text-[10px] font-semibold">
                  DJ
                </AvatarFallback>
              </Avatar>
              <div className="px-3.5 py-2.5 rounded-[12px_12px_12px_4px] bg-[var(--color-surface-tertiary)] border border-[var(--color-border-primary)] text-[14px] text-[var(--color-text-primary)] leading-relaxed">
                {en
                  ? "Hi! I'm DJ's AI assistant. Ask me anything about his experience, skills, or career — I'll give you grounded, specific answers."
                  : "안녕하세요! DJ의 AI 어시스턴트입니다. 경력, 기술, 커리어에 대해 무엇이든 물어보세요 — 근거 있는 구체적인 답변을 드리겠습니다."}
              </div>
            </div>

            <p className="text-[14px] text-[var(--color-text-tertiary)] mb-4">
              {en ? "Try one of these:" : "이런 것들을 질문해보세요:"}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() =>
                  onSend(
                    en ? "Please introduce yourself." : "자기소개를 해주세요.",
                  )
                }
                style={{ animation: "fadeInUp 0.4s ease-out 0s both" }}
                className="text-left px-3.5 py-2.5 text-[14px] text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-lg cursor-pointer leading-relaxed hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)] transition-colors"
              >
                {en ? "Please introduce yourself." : "자기소개를 해주세요."}
              </button>
              {starters.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSend(q)}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${(i + 1) * 0.08}s both`,
                  }}
                  className="text-left px-3.5 py-2.5 text-[14px] text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-lg cursor-pointer leading-relaxed hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            m={message}
            status={status}
            lastMessageId={messages[messages.length - 1]?.id}
            internal={internal}
            selectedTraceMessageId={selectedTraceMessageId}
            onSelectTrace={onSelectTrace}
            onFeedback={onFeedback}
          />
        ))}

        <FollowUpSuggestions
          lang={lang}
          aiFollowUps={aiFollowUps}
          unusedStarters={unusedStarters}
          showDigDeeper={showDigDeeper}
          showOrTry={showOrTry}
          onSend={onSend}
        />

        {/* Typing indicator */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-start gap-2 p-1">
              <Avatar size="sm">
                <AvatarFallback className="bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] text-[10px] font-semibold">
                  DJ
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-key)] animate-pulse" />
                  <span
                    className="w-[5px] h-[5px] rounded-full bg-[var(--color-key)] animate-pulse"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-[5px] h-[5px] rounded-full bg-[var(--color-key)] animate-pulse"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
                <span className="text-[12px] text-[var(--color-text-tertiary)]">
                  {en ? "DJ is thinking..." : "DJ가 생각 중..."}
                </span>
              </div>
            </div>
          )}

        {/* Error */}
        {status === "error" && error && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-2xl px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {getErrorMessage()}
              </p>
              <Button
                variant="link"
                onClick={onReset}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-0 h-auto mt-1"
              >
                {en ? "Reset conversation" : "대화 초기화"}
              </Button>
            </div>
          </div>
        )}

        <div className="sr-only" role="status" aria-live="polite">
          {status === "ready" &&
          messages[messages.length - 1]?.role === "assistant"
            ? en
              ? "Answer complete"
              : "답변 완료"
            : ""}
        </div>
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={onStop}
        disabled={isLoading}
        streaming={isLoading}
        lang={lang}
      />
    </div>
  );
}
