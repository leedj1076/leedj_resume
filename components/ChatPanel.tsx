"use client";

import { useState, useRef, useEffect } from "react";
import type { UIMessage } from "ai";
import Markdown from "react-markdown";
import FeedbackButtons from "./FeedbackButtons";
import { STARTER_QUESTIONS, type Lang } from "@/lib/profile-data";

interface ChatPanelProps {
  lang: Lang;
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  onFeedback: (messageId: string, value: "up" | "down") => void;
  starterIndices: number[];
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");
}

export default function ChatPanel({
  lang,
  messages,
  status,
  error,
  onSend,
  onStop,
  onReset,
  onFeedback,
  starterIndices,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const en = lang === "en";
  const isLoading = status === "submitted" || status === "streaming";

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

  // Derive starters from current lang (indices are stable across lang switches)
  const starters = starterIndices.map((i) => STARTER_QUESTIONS[lang][i]);

  // Follow-up chips: 2 unused starters after AI response
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map(getMessageText);
  const allStarters = STARTER_QUESTIONS[lang];
  const unusedStarters = allStarters.filter((q) => !userTexts.includes(q));
  const lastMsg = messages[messages.length - 1];
  const showFollowUps =
    messages.length > 0 &&
    !isLoading &&
    lastMsg?.role === "assistant" &&
    unusedStarters.length > 0;
  const followUps = unusedStarters.slice(0, 2);

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
      <div className="px-6 pt-5 pb-4 border-b border-[#f0f0f0] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[7px] h-[7px] rounded-full bg-green-500 animate-pulse" />
          <span className="text-[13px] font-medium text-[#1a1a1a]">
            Ask DJ
          </span>
          <span className="text-[11px] text-[#737373] ml-1">
            — {en ? "AI-powered" : "AI 기반"}
          </span>
          <button
            onClick={onReset}
            disabled={messages.length === 0}
            className="ml-auto text-[11px] text-[#737373] hover:text-[#676767] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            {en ? "Reset" : "초기화"}
          </button>
        </div>
        <p className="text-xs text-[#737373] mt-1 leading-relaxed">
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
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a] text-white text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                DJ
              </div>
              <div className="px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-[#f8f8f8] border border-[#f0f0f0] text-[13px] text-[#1a1a1a] leading-relaxed">
                {en
                  ? "Hi! I'm DJ's AI assistant. Ask me anything about his experience, skills, or career — I'll give you grounded, specific answers."
                  : "안녕하세요! DJ의 AI 어시스턴트입니다. 경력, 기술, 커리어에 대해 무엇이든 물어보세요 — 근거 있는 구체적인 답변을 드리겠습니다."}
              </div>
            </div>

            <p className="text-[13px] text-[#737373] mb-4">
              {en ? "Try one of these:" : "다음 중 하나를 시도해보세요:"}
            </p>
            <div className="flex flex-col gap-2">
              {starters.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSend(q)}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
                  }}
                  className="text-left px-3.5 py-2.5 text-[13px] text-[#1a1a1a] bg-[#fafafa] border border-[#f0f0f0] rounded-lg cursor-pointer leading-relaxed hover:bg-[#f0fdf4] hover:border-[#bbf7d0] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m) => {
          const text = getMessageText(m);
          return (
            <div
              key={m.id}
              className="mb-3 animate-[slideUp_0.25s_ease-out]"
            >
              {m.role === "user" ? (
                <div className="flex justify-end items-start gap-2">
                  <div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_4px_14px] bg-[#1a1a1a] text-white text-[13px] leading-relaxed">
                    {text}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#e5e5e5] text-[#737373] flex items-center justify-center shrink-0 mt-0.5">
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
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-start items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#1a1a1a] text-white text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      DJ
                    </div>
                    <div className="max-w-[85%] px-4 py-3 rounded-[14px_14px_14px_4px] bg-[#f8f8f8] border border-[#f0f0f0]">
                      <div className="prose prose-sm max-w-none text-[13px] text-[#1a1a1a] leading-[1.7] prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-[#1a1a1a]">
                        <Markdown>{text}</Markdown>
                      </div>
                      {status === "streaming" &&
                        m.id === messages[messages.length - 1]?.id &&
                        text && (
                          <span className="inline-block w-0.5 h-[13px] bg-[#1a1a1a] ml-0.5 animate-pulse align-text-bottom" />
                        )}
                    </div>
                  </div>
                  <div className="flex justify-start ml-8">
                    <FeedbackButtons
                      messageId={m.id}
                      onFeedback={onFeedback}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Follow-up chips */}
        {showFollowUps && (
          <div className="flex flex-wrap gap-2 mb-3 animate-[fadeIn_0.3s_ease-out]">
            {followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onSend(q)}
                className="px-3 py-1.5 text-[12px] text-[#676767] bg-white border border-[#e5e5e5] rounded-full cursor-pointer hover:bg-[#f0fdf4] hover:border-[#bbf7d0] hover:text-[#1a1a1a] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-start gap-2 p-1">
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                DJ
              </div>
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="w-[5px] h-[5px] rounded-full bg-green-500 animate-pulse" />
                  <span
                    className="w-[5px] h-[5px] rounded-full bg-green-500 animate-pulse"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-[5px] h-[5px] rounded-full bg-green-500 animate-pulse"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
                <span className="text-[11px] text-[#737373]">
                  {en ? "DJ is thinking..." : "DJ가 생각 중..."}
                </span>
              </div>
            </div>
          )}

        {/* Error */}
        {status === "error" && error && (
          <div className="flex justify-start">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-600">{getErrorMessage()}</p>
              <button
                onClick={onReset}
                className="text-xs text-red-500 hover:text-red-700 underline mt-1 cursor-pointer"
              >
                {en ? "Reset conversation" : "대화 초기화"}
              </button>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-3 pb-5 border-t border-[#f0f0f0] flex gap-2 items-end shrink-0"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          placeholder={en ? "Ask me anything..." : "무엇이든 물어보세요..."}
          className="flex-1 text-[13px] px-3.5 py-2.5 border border-[#e5e5e5] rounded-lg text-[#1a1a1a] bg-white outline-none transition-colors duration-150 focus:border-green-500 disabled:opacity-50 resize-none"
          style={{ maxHeight: 120, overflowY: "hidden" }}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="text-xs font-medium text-white px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors cursor-pointer shrink-0"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="text-xs font-medium text-white px-4 py-2.5 rounded-lg transition-colors cursor-pointer bg-[#1a1a1a] hover:bg-[#333] disabled:bg-[#d6d6d6] disabled:cursor-default shrink-0"
          >
            {en ? "Send" : "전송"}
          </button>
        )}
      </form>
    </div>
  );
}
