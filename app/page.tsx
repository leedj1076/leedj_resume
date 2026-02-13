"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

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
    questions: [
      "\uB370\uBE0C\uC2A4 \uC720\uB098\uC774\uD2F0\uB4DC\uC5D0\uC11C \uBB34\uC5C7\uC744 \uD558\uC168\uB098\uC694?",
      "\uC5B4\uB5A4 \uAE30\uC220\uC744 \uB2E4\uB8E8\uC2DC\uB098\uC694?",
      "\uD559\uB825\uC5D0 \uB300\uD574 \uC54C\uB824\uC8FC\uC138\uC694",
      "\uD30C\uD2B8\uB108\uC2ED \uACBD\uD5D8\uC744 \uC124\uBA85\uD574 \uC8FC\uC138\uC694",
    ],
  },
} as const;

export default function Home() {
  const { messages, sendMessage, status, error } = useChat({
    onError: (err) => console.error("Chat error:", err),
  });
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = UI[lang];
  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSuggestion = (question: string) => {
    sendMessage({ text: question });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "ko" : "en")}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
        >
          {lang === "en" ? "KO" : "EN"}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                {t.welcome}
              </h2>
              <p className="text-sm text-gray-500 mb-6">{t.startPrompt}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {t.questions.map((question) => (
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
            <div
              key={message.id}
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
          ))}

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
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t.send}
          </button>
        </form>
      </div>
    </div>
  );
}
