"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Inter } from "next/font/google";
import ProfilePanel from "./ProfilePanel";
import ChatPanel from "./ChatPanel";
import type { Lang } from "@/lib/profile-data";
import { STARTER_QUESTIONS } from "@/lib/profile-data";

const inter = Inter({ subsets: ["latin"] });

function shuffleIndices(length: number, pick: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, pick);
}

export default function ProfileApp() {
  const [lang, setLang] = useState<Lang>("en");
  const [sessionId] = useState(() => crypto.randomUUID());

  // Stable random starter indices (survive lang switches)
  const [starterIndices] = useState(() =>
    shuffleIndices(STARTER_QUESTIONS.en.length, 3)
  );

  const langRef = useRef<Lang>(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        visitorData: { persona: "hiring_manager" as const, focus: "full_stack" as const },
        sessionId,
        lang: langRef.current === "kr" ? "ko" : "en",
      }),
    })
  );

  const { messages, sendMessage, stop, setMessages, status, error } = useChat({
    transport: transportRef.current,
    onError: (err) => console.error("Chat error:", err),
  });

  const askChat = useCallback(
    (question: string) => {
      sendMessage({ text: question });
    },
    [sendMessage]
  );

  const handleReset = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const handleFeedback = useCallback(
    (messageId: string, value: "up" | "down") => {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          value,
          persona: "hiring_manager",
          focus: "full_stack",
          sessionId,
        }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const en = lang === "en";

  return (
    <div
      className={`${inter.className} h-screen flex flex-col bg-white text-[#1a1a1a] selection:bg-[#d1fae5]`}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-[#f0f0f0] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-[#1a1a1a] tracking-tight">
            DJ Lee
          </span>
          <span className="text-[11px] text-[#d6d6d6]">|</span>
          <span className="text-[11px] text-[#979797]">
            {en ? "Interactive Profile" : "인터랙티브 프로필"}
          </span>
        </div>
        <div className="inline-flex border border-[#e5e5e5] rounded-[5px] overflow-hidden">
          <button
            onClick={() => setLang("en")}
            className={`px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150 ${
              lang === "en"
                ? "bg-[#1a1a1a] text-white font-semibold"
                : "bg-white text-[#979797] font-normal"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("kr")}
            className={`px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150 ${
              lang === "kr"
                ? "bg-[#1a1a1a] text-white font-semibold"
                : "bg-white text-[#979797] font-normal"
            }`}
          >
            KR
          </button>
        </div>
      </nav>

      {/* Two-column layout — stacks on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Profile */}
        <div className="h-[40vh] lg:h-auto lg:w-[42%] lg:min-w-[360px] lg:max-w-[480px] border-b lg:border-b-0 lg:border-r border-[#f0f0f0] shrink-0">
          <ProfilePanel lang={lang} onAskChat={askChat} />
        </div>

        {/* Right: Chat */}
        <div className="flex-1 min-w-0 min-h-0">
          <ChatPanel
            lang={lang}
            messages={messages}
            status={status as "ready" | "submitted" | "streaming" | "error"}
            error={error}
            onSend={askChat}
            onStop={stop}
            onReset={handleReset}
            onFeedback={handleFeedback}
            starterIndices={starterIndices}
          />
        </div>
      </div>
    </div>
  );
}
