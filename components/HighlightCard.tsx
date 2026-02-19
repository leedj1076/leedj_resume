"use client";

import { useState } from "react";

interface HighlightCardProps {
  title: string;
  text: string;
}

export default function HighlightCard({ title, text }: HighlightCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors duration-200 ${
        open
          ? "border-[#e5e5e5] bg-[#fafafa]"
          : "border-[#f0f0f0] hover:border-[#e5e5e5]"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer"
      >
        <span className="text-[13px] font-medium text-[#1a1a1a]">
          {title}
        </span>
        <span
          className={`text-[11px] text-[#979797] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          &#x25BE;
        </span>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-[12.5px] text-[#676767] leading-[1.7] animate-[fadeIn_0.25s_ease-out]">
          {text}
        </div>
      )}
    </div>
  );
}
