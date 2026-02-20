"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import type { VisitorData } from "@/lib/types";
import { PERSONA_QUESTIONS } from "@/lib/persona-config";
import WelcomeModal from "@/components/WelcomeModal";
import FeedbackButtons from "@/components/FeedbackButtons";
import SkeletonLoader from "@/components/SkeletonLoader";

type Lang = "en" | "ko";

const UI = {
  en: {
    title: "Chat with My Resume",
    subtitle: "Ask me anything about my professional experience",
    welcome: "Welcome! I\u2019m ready to answer questions about my resume.",
    startPrompt: "Try one of these questions to get started:",
    placeholder: "Ask about my experience...",
    send: "Send",
    thinking: "Thinking...",
    user: "Recruiter",
    assistant: "Assistant",
    error: "Something went wrong. Please try again.",
    settingsTooltip: "Reset settings",
    resetConfirm: "Reset conversation and change settings?",
    coldStartLoading: "Preparing your personalized experience...",
    questions: [
      "What did you do at Devs United Games?",
      "What technologies do you work with?",
      "Tell me about your education",
      "Describe your partnership experience",
    ],
  },
  ko: {
    title: "\uB0B4 \uC774\uB825\uC11C\uC640 \uB300\uD654\uD558\uAE30",
    subtitle: "\uACBD\uB825\uC5D0 \uB300\uD574 \uBB50\uB4E0\uC9C0 \uBB3C\uC5B4\uBCF4\uC138\uC694",
    welcome: "\uD658\uC601\uD569\uB2C8\uB2E4! \uC774\uB825\uC11C\uC5D0 \uB300\uD55C \uC9C8\uBB38\uC5D0 \uB2F5\uBCC0\uD560 \uC900\uBE44\uAC00 \uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
    startPrompt: "\uC544\uB798 \uC9C8\uBB38\uC73C\uB85C \uC2DC\uC791\uD574 \uBCF4\uC138\uC694:",
    placeholder: "\uACBD\uB825\uC5D0 \uB300\uD574 \uC9C8\uBB38\uD574 \uBCF4\uC138\uC694...",
    send: "\uC804\uC1A1",
    thinking: "\uC0DD\uAC01 \uC911...",
    user: "\uBA74\uC811\uAD00",
    assistant: "\uC5B4\uC2DC\uC2A4\uD134\uD2B8",
    error: "\uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
    settingsTooltip: "\uC124\uC815 \uCD08\uAE30\uD654",
    resetConfirm: "\uB300\uD654\uB97C \uCD08\uAE30\uD654\uD558\uACE0 \uC124\uC815\uC744 \uBCC0\uACBD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    coldStartLoading: "\uB9DE\uCDA4\uD615 \uACBD\uD5D8\uC744 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4...",
    questions: [
      "\uB370\uBE0C\uC2A4 \uC720\uB098\uC774\uD2F0\uB4DC\uC5D0\uC11C \uBB34\uC5C7\uC744 \uD558\uC168\uB098\uC694?",
      "\uC5B4\uB5A4 \uAE30\uC220\uC744 \uB2E4\uB8E8\uC2DC\uB098\uC694?",
      "\uD559\uB825\uC5D0 \uB300\uD574 \uC54C\uB824\uC8FC\uC138\uC694",
      "\uD30C\uD2B8\uB108\uC2ED \uACBD\uD5D8\uC744 \uC124\uBA85\uD574 \uC8FC\uC138\uC694",
    ],
  },
} as const;

const STATIC_WELCOME = {
  en: "Welcome! I'm ready to answer questions about my professional experience. Feel free to ask anything!",
  ko: "\uD658\uC601\uD569\uB2C8\uB2E4! \uC81C \uACBD\uB825\uC5D0 \uB300\uD574 \uBB34\uC5C7\uC774\uB4E0 \uBB3C\uC5B4\uBCF4\uC138\uC694!",
};

export default function Home() {
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [showModal, setShowModal] = useState(true);
  const [coldStartLoading, setColdStartLoading] = useState(false);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visitorDataRef = useRef<VisitorData | null>(null);
  useEffect(() => {
    visitorDataRef.current = visitorData;
  }, [visitorData]);

  const langRef = useRef<Lang>(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        visitorData: visitorDataRef.current ?? undefined,
        sessionId,
        lang: langRef.current,
      }),
    })
  );

  const { messages, sendMessage, stop, setMessages, status, error } = useChat({
    transport: transportRef.current,
    onError: (err) => console.error("Chat error:", err),
  });

  const t = UI[lang];
  const isLoading = status === "submitted" || status === "streaming";

  // Suggested questions: persona-aware or static fallback
  const suggestedQuestions =
    visitorData
      ? PERSONA_QUESTIONS[visitorData.persona][lang]
      : t.questions;

  // Sync html lang attribute with selected language
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, coldStartLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSuggestion = (question: string) => {
    sendMessage({ text: question });
  };

  async function handleModalSubmit(data: VisitorData) {
    setVisitorData(data);
    visitorDataRef.current = data;
    setShowModal(false);
    setColdStartLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          type: "init",
          visitorData: data,
          lang,
        }),
      });
      const { welcome } = await res.json();
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          parts: [{ type: "text" as const, text: welcome }],
        },
      ]);
    } catch {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          parts: [{ type: "text" as const, text: STATIC_WELCOME[lang] }],
        },
      ]);
    } finally {
      setColdStartLoading(false);
    }
  }

  function handleReset() {
    if (window.confirm(t.resetConfirm)) {
      setMessages([]);
      setVisitorData(null);
      visitorDataRef.current = null;
      setShowModal(true);
    }
  }

  const handleFeedback = useCallback(
    (messageId: string, value: "up" | "down") => {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          value,
          persona: visitorData?.persona,
          focus: visitorData?.focus,
          sessionId,
        }),
      }).catch(() => {});
    },
    [visitorData, sessionId]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Welcome Modal */}
      {showModal && <WelcomeModal lang={lang} onSubmit={handleModalSubmit} />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Profile View link */}
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors no-underline"
          >
            Profile View
          </a>
          {/* Settings reset button */}
          {!showModal && (
            <button
              onClick={handleReset}
              title={t.settingsTooltip}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ko" : "en")}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            {lang === "en" ? "KO" : "EN"}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Cold start skeleton */}
          {coldStartLoading && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-4">{t.coldStartLoading}</p>
              <SkeletonLoader />
            </div>
          )}

          {/* Empty state with suggested questions */}
          {!coldStartLoading && messages.length === 0 && !showModal && (
            <div className="text-center py-12">
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                {t.welcome}
              </h2>
              <p className="text-sm text-gray-500 mb-6">{t.startPrompt}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestion(question)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {message.role === "user" ? t.user : t.assistant}
                  </p>
                  <div className="text-sm">
                    {message.role === "user" ? (
                      <span className="whitespace-pre-wrap">
                        {message.parts
                          .filter((p) => p.type === "text")
                          .map((p) => ("text" in p ? p.text : ""))
                          .join("")}
                      </span>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-gray-900">
                        <Markdown>
                          {message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => ("text" in p ? p.text : ""))
                            .join("")}
                        </Markdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Feedback buttons for assistant messages */}
              {message.role === "assistant" && (
                <div className="flex justify-start ml-1">
                  <FeedbackButtons
                    messageId={message.id}
                    onFeedback={handleFeedback}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Suggested questions after welcome message */}
          {messages.length === 1 && messages[0].role === "assistant" && !isLoading && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">{t.startPrompt}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestion(question)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <p className="text-xs font-medium mb-1 text-gray-400">
                  {t.assistant}
                </p>
                <p className="text-sm text-gray-400 animate-pulse">
                  {t.thinking}
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {status === "error" && error && (
            <div className="flex justify-start">
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-600">{t.error}</p>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="px-6 py-3 bg-red-500 text-white text-sm font-medium rounded-full hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t.send}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
