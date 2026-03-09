"use client";

import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import FeedbackButtons from "./FeedbackButtons";
import { STARTER_QUESTIONS, PERSONA_STARTER_QUESTIONS, type Lang } from "@/lib/profile-data";
import type { ChatUIMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface ChatPanelProps {
  lang: Lang;
  persona: string;
  messages: ChatUIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  onFeedback: (messageId: string, value: "up" | "down") => void;
  starterIndices: number[];
  internal?: boolean;
  selectedTraceMessageId?: string | null;
  onSelectTrace?: (messageId: string) => void;
}

function getMessageText(message: ChatUIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");
}

function parseFollowUps(text: string): { clean: string; followUps: string[] } {
  const match = text.match(/<followup>\n?([\s\S]*?)<\/followup>\s*$/);
  if (!match) return { clean: text, followUps: [] };
  return {
    clean: text.replace(match[0], "").trimEnd(),
    followUps: match[1].trim().split("\n").filter(Boolean).slice(0, 2),
  };
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
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const en = lang === "en";
  const isLoading = status === "submitted" || status === "streaming";

  const exportConversation = async () => {
    if (messages.length === 0) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mL = 26;
    const mR = 26;
    const contentW = pageW - mL - mR;
    let y = 32;

    const addPage = () => { doc.addPage(); y = 26; };
    const need = (h: number) => { if (y + h > pageH - 22) addPage(); };

    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // ── Section label — small, bold, ultra-wide tracking ──
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.setCharSpace(4.5);
    doc.text("CONVERSATION", mL, y);
    doc.setCharSpace(0);
    y += 18;

    // ── Title — large, light weight ──
    doc.setFontSize(28);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text("DJ Lee", mL, y);
    y += 12;

    // ── Subtitle ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(190, 190, 190);
    doc.text("Interactive Profile", mL, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(date, mL, y);
    y += 16;

    // ── Hairline rule ──
    doc.setDrawColor(215, 215, 215);
    doc.setLineWidth(0.15);
    doc.line(mL, y, pageW - mR, y);
    y += 16;

    // ── Messages ──
    for (const m of messages) {
      const isUser = m.role === "user";
      const text = getMessageText(m).replace(/\*\*/g, "");

      // Generous text column offset from label
      const labelX = mL;
      const textX = mL + 12;
      const textW = contentW - 12;

      const fontSize = isUser ? 10 : 9.5;
      const lineH = 5.5;

      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isUser ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, textW);
      const blockH = lines.length * lineH;
      need(blockH + 16);

      // Label — single letter, wide-tracked
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setCharSpace(2);
      if (isUser) {
        doc.setTextColor(30, 30, 30);
      } else {
        doc.setTextColor(195, 195, 195);
      }
      doc.text(isUser ? "Q" : "A", labelX, y + 0.5);
      doc.setCharSpace(0);

      // Thin vertical accent — subtle, minimal style
      doc.setDrawColor(isUser ? 60 : 215, isUser ? 60 : 215, isUser ? 60 : 215);
      doc.setLineWidth(0.3);
      doc.line(labelX + 6.5, y - 2.5, labelX + 6.5, y + blockH - 1);

      // Body text
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isUser ? "bold" : "normal");
      doc.setTextColor(isUser ? 35 : 100, isUser ? 35 : 100, isUser ? 35 : 100);
      let ty = y;
      for (const line of lines) {
        need(lineH + 2);
        doc.text(line, textX, ty);
        ty += lineH;
      }
      y = ty + 12;
    }

    // ── Footer on every page ──
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(1.5);
      doc.setTextColor(195, 195, 195);
      doc.text("DJ LEE", mL, pageH - 14);
      doc.setCharSpace(0);
      doc.setFontSize(7);
      doc.text("Interactive Profile", mL + 16, pageH - 14);
      doc.text(`${p}`, pageW - mR, pageH - 14, { align: "right" });
    }

    doc.save(`dj-lee-chat-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      onSend(input.trim());
      setInput("");
    }
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
    if (!error)
      return en ? "Something went wrong." : "문제가 발생했습니다.";
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
              onClick={exportConversation}
              disabled={messages.length === 0}
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
        <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
          {en
            ? "Ask anything about my experience, skills, or career. Answers are grounded in verified professional data."
            : "경력, 기술, 커리어에 대해 무엇이든 물어보세요. 검증된 전문 데이터에 기반한 답변입니다."}
        </p>
      </div>

      {/* Messages */}
      <div className="profile-scroll flex-1 overflow-y-auto px-6 py-4">
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
                onClick={() => onSend(en ? "Please introduce yourself." : "자기소개를 해주세요.")}
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
        {messages.map((m) => {
          const rawText = getMessageText(m);
          const isAssistant = m.role === "assistant";
          const { clean: text } = isAssistant
            ? parseFollowUps(rawText)
            : { clean: rawText };
          return (
            <div
              key={m.id}
              className="mb-3 animate-[slideUp_0.25s_ease-out]"
            >
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
                      <div className="prose prose-sm max-w-none text-[14px] text-[var(--color-text-primary)] leading-[1.7] prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-[var(--color-text-primary)] prose-strong:font-semibold prose-headings:text-[15px] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1">
                        <Markdown>{text}</Markdown>
                      </div>
                      {status === "streaming" &&
                        m.id === messages[messages.length - 1]?.id &&
                        rawText && (
                          <span className="inline-block w-0.5 h-[13px] bg-[var(--color-text-primary)] ml-0.5 animate-pulse align-text-bottom" />
                        )}
                    </div>
                  </div>
                  <div className="flex justify-start items-center gap-2 ml-8">
                    <FeedbackButtons
                      messageId={m.id}
                      onFeedback={onFeedback}
                    />
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
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        })}

        {/* Follow-up chips — AI-generated "Dig deeper" + generic "Or try" */}
        {showDigDeeper && (
          <div className="mb-2 animate-[fadeIn_0.3s_ease-out]">
            <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5 block">
              {en ? "Dig deeper" : "더 알아보기"}
            </span>
            <div className="flex flex-wrap gap-2">
              {aiFollowUps.map((q, i) => (
                <button
                  key={`ai-${i}`}
                  onClick={() => onSend(q)}
                  className="px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] bg-[var(--color-page-bg)] border border-[var(--color-border-secondary)] rounded-full cursor-pointer hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {showOrTry && (
          <div className="mb-3 animate-[fadeIn_0.3s_ease-out]">
            <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5 block">
              {showDigDeeper
                ? (en ? "Or try" : "또는")
                : (en ? "Ask about" : "질문해보기")}
            </span>
            <div className="flex flex-wrap gap-2">
              {unusedStarters.slice(0, 2).map((q, i) => (
                <button
                  key={`gen-${i}`}
                  onClick={() => onSend(q)}
                  className="px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] bg-[var(--color-page-bg)] border border-[var(--color-border-secondary)] rounded-full cursor-pointer hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

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
              <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage()}</p>
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

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-3 pb-5 border-t border-[var(--color-border-primary)] flex gap-2 items-end shrink-0"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          placeholder={en ? "Ask me anything..." : "무엇이든 물어보세요..."}
          className="flex-1 text-[14px] px-3.5 py-2.5 min-h-0 border-[var(--color-border-secondary)] rounded-lg text-[var(--color-text-primary)] bg-[var(--color-page-bg)] focus-visible:border-[var(--color-key)] focus-visible:ring-[var(--color-key)]/20 resize-none shadow-none"
          style={{ maxHeight: 120, overflowY: "hidden", fieldSizing: "fixed" }}
        />
        {isLoading ? (
          <Button
            type="button"
            variant="destructive"
            onClick={onStop}
            className="text-xs font-medium px-4 py-2.5 h-auto rounded-lg shrink-0"
          >
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            className="text-xs font-medium px-4 py-2.5 h-auto rounded-lg shrink-0 bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] hover:bg-[var(--color-button-send-hover)] disabled:bg-[var(--color-button-send-disabled)] disabled:opacity-100"
          >
            {en ? "Send" : "전송"}
          </Button>
        )}
      </form>
    </div>
  );
}
