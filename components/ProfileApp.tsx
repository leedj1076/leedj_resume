"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ProfilePanel from "./ProfilePanel";
import ChatPanel from "./ChatPanel";
import type { Lang } from "@/lib/profile-data";
import { STARTER_QUESTIONS, V14_PERSONA_OPTIONS } from "@/lib/profile-data";

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
  const [persona, setPersona] = useState("hiring_manager");
  const [mobileTab, setMobileTab] = useState<"profile" | "chat">("profile");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [darkMode, setDarkMode] = useState(false);

  // Sync dark mode state with DOM on mount
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [darkMode]);

  // Deterministic default to avoid hydration mismatch; randomize after mount
  const [starterIndices, setStarterIndices] = useState<number[]>([0, 1, 2]);
  useEffect(() => {
    setStarterIndices(shuffleIndices(STARTER_QUESTIONS.en.length, 3));
  }, []);

  const langRef = useRef<Lang>(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const personaRef = useRef(persona);
  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        visitorData: { persona: personaRef.current, focus: "full_stack" as const },
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
      setMobileTab("chat");
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
          persona: personaRef.current,
          focus: "full_stack",
          sessionId,
        }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const en = lang === "en";

  return (
    <div className="h-screen flex flex-col bg-[var(--color-page-bg)] text-[var(--color-text-primary)] font-[family-name:var(--font-geist-sans)] selection:bg-[var(--color-selection)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--color-border-primary)] shrink-0 gap-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight">
            DJ Lee
          </span>
          <span className="text-[11px] text-[var(--color-separator)] hidden sm:inline">|</span>
          <span className="text-[11px] text-[var(--color-text-tertiary)] hidden sm:inline">
            {en ? "Interactive Profile" : "인터랙티브 프로필"}
          </span>
        </div>

        {/* Persona pills — desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {V14_PERSONA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPersona(opt.value)}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors cursor-pointer ${
                persona === opt.value
                  ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] border-[var(--color-surface-inverted)] font-medium"
                  : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] border-[var(--color-border-secondary)] hover:border-[var(--color-hover-border)]"
              }`}
            >
              {en ? opt.en : opt.kr}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/v1"
            className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors no-underline hidden sm:inline"
          >
            Classic
          </a>
          <a
            href="/ui"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors no-underline hidden sm:inline"
          >
            UI Lab
          </a>
          <span className="text-[11px] text-[var(--color-separator-light)] hidden sm:inline">|</span>
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            {darkMode ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {/* Lang toggle */}
          <div className="inline-flex border border-[var(--color-border-secondary)] rounded-[5px] overflow-hidden">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150 ${
                lang === "en"
                  ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] font-semibold"
                  : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] font-normal"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("kr")}
              className={`px-2.5 py-0.5 text-[11px] border-none cursor-pointer transition-colors duration-150 ${
                lang === "kr"
                  ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] font-semibold"
                  : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] font-normal"
              }`}
            >
              KO
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile persona selector */}
      <div className="sm:hidden flex items-center gap-1 px-4 py-2 border-b border-[var(--color-border-primary)] overflow-x-auto">
        {V14_PERSONA_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPersona(opt.value)}
            className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors cursor-pointer whitespace-nowrap ${
              persona === opt.value
                ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] border-[var(--color-surface-inverted)] font-medium"
                : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] border-[var(--color-border-secondary)]"
            }`}
          >
            {en ? opt.en : opt.kr}
          </button>
        ))}
      </div>

      {/* Mobile tab bar */}
      <div className="lg:hidden flex border-b border-[var(--color-border-primary)] shrink-0">
        <button
          onClick={() => setMobileTab("profile")}
          className={`flex-1 py-2.5 text-[12px] font-medium text-center transition-colors cursor-pointer ${
            mobileTab === "profile"
              ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
        >
          {en ? "Profile" : "프로필"}
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2.5 text-[12px] font-medium text-center transition-colors cursor-pointer ${
            mobileTab === "chat"
              ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
        >
          {en ? "Chat" : "채팅"}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Profile */}
        <div
          className={`${
            mobileTab === "profile" ? "flex" : "hidden"
          } lg:flex h-full lg:h-auto lg:w-[42%] lg:min-w-[360px] lg:max-w-[480px] lg:border-r border-[var(--color-border-primary)] shrink-0 flex-col`}
        >
          <ProfilePanel lang={lang} onAskChat={askChat} />
        </div>

        {/* Right: Chat */}
        <div
          className={`${
            mobileTab === "chat" ? "flex" : "hidden"
          } lg:flex flex-1 min-w-0 min-h-0 flex-col`}
        >
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
