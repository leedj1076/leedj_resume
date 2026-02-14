"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

export default function CapturePage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const passwordRef = useRef("");
  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/capture",
      body: () => ({ password: passwordRef.current }),
    })
  );

  const { messages, sendMessage, stop, status, error } = useChat({
    transport: transportRef.current,
    onError: (err) => console.error("Capture error:", err),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("capture_password");
    if (stored) {
      setPassword(stored);
      passwordRef.current = stored;
      setAuthenticated(true);
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    // We can't verify the password client-side, so we store it and let the API verify
    // Try a test request to verify
    fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], password: passwordInput }),
    }).then((res) => {
      if (res.status === 401) {
        setAuthError(true);
      } else {
        setPassword(passwordInput);
        passwordRef.current = passwordInput;
        sessionStorage.setItem("capture_password", passwordInput);
        setAuthenticated(true);
        setAuthError(false);
      }
    }).catch(() => {
      setAuthError(true);
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  function downloadTranscript() {
    const transcript = messages.map((m) => ({
      role: m.role,
      content: m.parts
        .filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join(""),
    }));

    const date = new Date().toISOString().split("T")[0];
    const blob = new Blob([JSON.stringify(transcript, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capture-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAsText() {
    const lines = messages.map((m) => {
      const content = m.parts
        .filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("");
      const role = m.role === "user" ? "Human" : "Assistant";
      return `${role}: ${content}`;
    });

    const date = new Date().toISOString().split("T")[0];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capture-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Password gate
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <form
          onSubmit={handleAuth}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4"
        >
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Knowledge Capture
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter the admin password to start an interview session.
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setAuthError(false);
            }}
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
          />
          {authError && (
            <p className="text-sm text-red-500 mb-3">Invalid password</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Knowledge Capture Interview
          </h1>
          <p className="text-sm text-gray-500">
            {messages.length} messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadAsText}
            disabled={messages.length === 0}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save .txt
          </button>
          <button
            onClick={downloadTranscript}
            disabled={messages.length === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save .json
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                Ready to start an interview session
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                The AI will ask you structured questions to capture your professional experience.
              </p>
              <button
                onClick={() => sendMessage({ text: "Let's start. Show me the topic menu." })}
                className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors"
              >
                Start Interview
              </button>
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-800"
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-70">
                  {message.role === "user" ? "DJ" : "Interviewer"}
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
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
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
                  Interviewer
                </p>
                <p className="text-sm text-gray-400 animate-pulse">
                  Thinking...
                </p>
              </div>
            </div>
          )}

          {status === "error" && error && (
            <div className="flex justify-start">
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-600">
                  Error: {error.message}. Check your password or try again.
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your answer... (Shift+Enter for new line)"
            rows={2}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="px-6 py-3 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
