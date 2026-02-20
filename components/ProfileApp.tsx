"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ProfilePanel from "./ProfilePanel";
import ChatPanel from "./ChatPanel";
import V14WelcomeModal from "./V14WelcomeModal";
import type { Lang } from "@/lib/profile-data";
import { STARTER_QUESTIONS, PERSONA_STARTER_QUESTIONS, V14_PERSONA_OPTIONS } from "@/lib/profile-data";
import type { ChatUIMessage } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

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
  const [showWelcome, setShowWelcome] = useState(false);

  // Sync dark mode state with DOM on mount; check if welcome modal should show
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
    if (!sessionStorage.getItem("v14-welcomed")) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeStart = useCallback((selectedLang: Lang, selectedPersona: string) => {
    setLang(selectedLang);
    setPersona(selectedPersona);
    setShowWelcome(false);
    sessionStorage.setItem("v14-welcomed", "1");
  }, []);

  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [darkMode]);

  // Deterministic default to avoid hydration mismatch; randomize after mount and on persona change
  const [starterIndices, setStarterIndices] = useState<number[]>([0, 1, 2]);
  useEffect(() => {
    const questions = PERSONA_STARTER_QUESTIONS[persona]?.en ?? STARTER_QUESTIONS.en;
    setStarterIndices(shuffleIndices(questions.length, 3));
  }, [persona]);

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

  const { messages, sendMessage, stop, setMessages, status, error } = useChat<ChatUIMessage>({
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
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              onClick={() => setPersona(opt.value)}
              className={`rounded-full text-[11px] px-2.5 py-1 h-auto ${
                persona === opt.value
                  ? "bg-[var(--color-key)] text-white border-[var(--color-key)] font-medium hover:bg-[var(--color-key)] hover:text-white"
                  : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] border-[var(--color-border-secondary)] hover:border-[var(--color-hover-border)]"
              }`}
            >
              {en ? opt.en : opt.kr}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {darkMode ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
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
            )}
          </Button>
          {/* Lang toggle */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setLang(lang === "en" ? "kr" : "en")}
            aria-label={lang === "en" ? "Switch to Korean" : "Switch to English"}
            className="text-[11px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {lang === "en" ? "EN" : "KO"}
          </Button>
        </div>
      </nav>

      {/* Mobile persona selector */}
      <div className="sm:hidden flex items-center gap-1 px-4 py-2 border-b border-[var(--color-border-primary)] overflow-x-auto">
        {V14_PERSONA_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant="outline"
            size="sm"
            onClick={() => setPersona(opt.value)}
            className={`rounded-full text-[11px] px-2.5 py-1 h-auto whitespace-nowrap ${
              persona === opt.value
                ? "bg-[var(--color-key)] text-white border-[var(--color-key)] font-medium hover:bg-[var(--color-key)] hover:text-white"
                : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] border-[var(--color-border-secondary)]"
            }`}
          >
            {en ? opt.en : opt.kr}
          </Button>
        ))}
      </div>

      {/* Mobile tab bar */}
      <Tabs
        value={mobileTab}
        onValueChange={(v) => setMobileTab(v as "profile" | "chat")}
        className="lg:hidden shrink-0 gap-0"
      >
        <TabsList
          variant="line"
          className="w-full rounded-none border-b border-[var(--color-border-primary)] bg-transparent p-0 h-auto"
        >
          <TabsTrigger
            value="profile"
            className="flex-1 py-2.5 text-[12px] font-medium rounded-none border-none data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none data-[state=active]:after:bg-[var(--color-text-primary)] text-[var(--color-text-tertiary)]"
          >
            {en ? "Profile" : "프로필"}
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex-1 py-2.5 text-[12px] font-medium rounded-none border-none data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none data-[state=active]:after:bg-[var(--color-text-primary)] text-[var(--color-text-tertiary)]"
          >
            {en ? "Chat" : "채팅"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Profile */}
        <div
          className={`${
            mobileTab === "profile" ? "flex" : "hidden"
          } lg:flex h-full lg:h-auto lg:w-[46%] lg:min-w-[390px] lg:max-w-[520px] lg:border-r border-[var(--color-border-primary)] shrink-0 flex-col bg-[var(--color-profile-bg)]`}
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
            persona={persona}
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

      {/* Welcome modal */}
      {showWelcome && (
        <V14WelcomeModal onStart={handleWelcomeStart} />
      )}
    </div>
  );
}
