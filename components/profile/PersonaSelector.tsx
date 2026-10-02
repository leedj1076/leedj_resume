"use client";

import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/domain/language";
import type { Persona, PersonaOption } from "@/lib/domain/personas";

interface PersonaSelectorProps {
  options: readonly PersonaOption[];
  value: Persona | null;
  onChange: (persona: Persona) => void;
  lang: Language;
  variant: "desktop" | "mobile" | "welcome";
}

export default function PersonaSelector({
  options,
  value,
  onChange,
  lang,
  variant,
}: PersonaSelectorProps) {
  const container =
    variant === "desktop"
      ? "hidden sm:flex items-center gap-1"
      : variant === "mobile"
        ? "sm:hidden flex items-center gap-1 px-4 py-2 border-b border-[var(--color-border-primary)] overflow-x-auto"
        : "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
  return (
    <div
      className={container}
      role="group"
      aria-label={lang === "en" ? "Visitor type" : "방문자 유형"}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="outline"
          size={variant === "welcome" ? "default" : "sm"}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={
            variant === "welcome"
              ? `py-2.5 h-auto text-[14px] rounded-lg whitespace-normal ${value === option.value ? "bg-[var(--color-surface-inverted)] dark:bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] dark:text-[var(--color-text-inverted)] border-[var(--color-surface-inverted)] dark:border-[var(--color-surface-inverted)] font-medium hover:bg-[var(--color-surface-inverted)] dark:hover:bg-[var(--color-surface-inverted)] hover:text-[var(--color-text-inverted)]" : "bg-[var(--color-page-bg)] dark:bg-[var(--color-page-bg)] text-[var(--color-text-primary)] dark:text-[var(--color-text-primary)] border-[var(--color-border-secondary)] dark:border-[var(--color-border-secondary)] hover:border-[var(--color-hover-border)]"}`
              : `rounded-full text-[11px] px-2.5 py-1 h-auto whitespace-nowrap ${value === option.value ? "bg-[var(--color-key)] dark:bg-[var(--color-key)] text-white border-[var(--color-key)] dark:border-[var(--color-key)] font-medium hover:bg-[var(--color-key)] dark:hover:bg-[var(--color-key)] hover:text-white" : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] border-[var(--color-border-secondary)] hover:border-[var(--color-hover-border)]"}`
          }
        >
          {option[lang]}
        </Button>
      ))}
    </div>
  );
}
