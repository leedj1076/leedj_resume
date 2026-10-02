"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FeedbackButtonsProps {
  messageId: string;
  onFeedback: (id: string, value: "up" | "down") => Promise<void> | void;
}

export default function FeedbackButtons({
  messageId,
  onFeedback,
}: FeedbackButtonsProps) {
  const [selected, setSelected] = useState<"up" | "down" | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = async (value: "up" | "down") => {
    if (selected || pending) return;
    setPending(true);
    setFailed(false);
    try {
      await onFeedback(messageId, value);
      setSelected(value);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex gap-1 mt-1 items-center">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => handleClick("up")}
        disabled={selected !== null || pending}
        aria-label="Thumbs up"
        className={`${
          selected === "up"
            ? "text-green-600 dark:text-green-400"
            : selected === null
              ? "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              : "text-gray-300 dark:text-gray-600"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => handleClick("down")}
        disabled={selected !== null || pending}
        aria-label="Thumbs down"
        className={`${
          selected === "down"
            ? "text-red-600 dark:text-red-400"
            : selected === null
              ? "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              : "text-gray-300 dark:text-gray-600"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </Button>
      {failed && (
        <span
          role="alert"
          className="text-[11px] text-red-600 dark:text-red-400"
        >
          Could not save. Try again.
        </span>
      )}
    </div>
  );
}
