"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import ChatComposer from "@/components/chat/ChatComposer";
import { adminTransportFetch } from "@/lib/admin/client";
import { serializeTranscript, type Transcript } from "@/lib/chat/transcript";

export function CaptureInterview() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/capture",
        credentials: "same-origin",
        fetch: adminTransportFetch,
      }),
  );

  const { messages, sendMessage, stop, status, error } = useChat({
    transport,
    onError: (err) => console.error("Capture error:", err),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function downloadTranscript(format: "json" | "text") {
    const transcript: Transcript = {
      version: 1,
      turns: messages
        .filter(
          (message) => message.role === "assistant" || message.role === "user",
        )
        .map((message) => ({
          speaker:
            message.role === "assistant"
              ? ("interviewer" as const)
              : ("subject" as const),
          text: message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(""),
        })),
    };
    const date = new Date().toISOString().split("T")[0];
    const blob = new Blob([serializeTranscript(transcript, format)], {
      type: format === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capture-${date}.${format === "json" ? "json" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Knowledge Capture Interview
          </h1>
          <p className="text-sm text-gray-500">{messages.length} messages</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadTranscript("text")}
            disabled={messages.length === 0}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save .txt
          </button>
          <button
            onClick={() => downloadTranscript("json")}
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
                The AI will ask you structured questions to capture your
                professional experience.
              </p>
              <button
                onClick={() =>
                  sendMessage({ text: "Let's start. Show me the topic menu." })
                }
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
                  Error: {error.message}. Please try again.
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white max-w-3xl w-full mx-auto">
        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={(text) => {
            sendMessage({ text });
            setInput("");
          }}
          onStop={stop}
          disabled={false}
          streaming={isLoading}
          lang="en"
          inputLabel="Your answer"
        />
      </div>
    </div>
  );
}
