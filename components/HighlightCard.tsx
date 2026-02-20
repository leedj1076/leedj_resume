"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface HighlightCardProps {
  title: string;
  text: string;
}

export default function HighlightCard({ title, text }: HighlightCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={`border rounded-lg overflow-hidden transition-colors duration-200 ${
          open
            ? "border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)]"
            : "border-[var(--color-border-primary)] hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)]"
        }`}
      >
        <CollapsibleTrigger className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {title}
          </span>
          <span
            className={`text-[11px] text-[var(--color-text-tertiary)] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            &#x25BE;
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3.5 pb-3.5 text-[12.5px] text-[var(--color-text-secondary)] leading-[1.7] animate-[fadeIn_0.25s_ease-out]">
            {text}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
