"use client";

import type { Language } from "@/lib/domain/language";

interface FollowUpSuggestionsProps {
  lang: Language;
  aiFollowUps: string[];
  unusedStarters: string[];
  showDigDeeper: boolean;
  showOrTry: boolean;
  onSend: (question: string) => void;
}

export default function FollowUpSuggestions({
  lang,
  aiFollowUps,
  unusedStarters,
  showDigDeeper,
  showOrTry,
  onSend,
}: FollowUpSuggestionsProps) {
  const en = lang === "en";
  return (
    <>
      {/* Follow-up chips — AI-generated "Dig deeper" + generic "Or try" */}
      {showDigDeeper && (
        <div className="mb-2 animate-[fadeIn_0.3s_ease-out]">
          <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5 block">
            {en ? "Dig deeper" : "더 알아보기"}
          </span>
          <div className="flex flex-wrap gap-2">
            {aiFollowUps.map((q, i) => (
              <button
                key={`ai-${i}`}
                onClick={() => onSend(q)}
                className="px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] bg-[var(--color-page-bg)] border border-[var(--color-border-secondary)] rounded-full cursor-pointer hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {showOrTry && (
        <div className="mb-3 animate-[fadeIn_0.3s_ease-out]">
          <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5 block">
            {showDigDeeper
              ? en
                ? "Or try"
                : "또는"
              : en
                ? "Ask about"
                : "질문해보기"}
          </span>
          <div className="flex flex-wrap gap-2">
            {unusedStarters.slice(0, 2).map((q, i) => (
              <button
                key={`gen-${i}`}
                onClick={() => onSend(q)}
                className="px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] bg-[var(--color-page-bg)] border border-[var(--color-border-secondary)] rounded-full cursor-pointer hover:bg-[var(--color-hover-accent-bg)] hover:border-[var(--color-hover-accent-border)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
