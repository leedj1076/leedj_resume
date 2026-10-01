"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/lib/domain/language";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  disabled: boolean;
  streaming: boolean;
  lang: Language;
}

export default function ChatComposer({ value, onChange, onSend, onStop, disabled, streaming, lang }: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [value]);
  const send = () => { if (!disabled && !streaming && value.trim()) onSend(value.trim()); };
  return <form onSubmit={(event) => { event.preventDefault(); send(); }}
    className="px-6 py-3 pb-5 border-t border-[var(--color-border-primary)] flex gap-2 items-end shrink-0">
    <Textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) return;
          event.preventDefault(); send();
        }
      }}
      disabled={disabled} rows={1} aria-label={lang === "en" ? "Ask a question" : "질문 입력"}
      placeholder={lang === "en" ? "Ask me anything..." : "무엇이든 물어보세요..."}
      className="flex-1 text-[14px] px-3.5 py-2.5 min-h-0 border-[var(--color-border-secondary)] rounded-lg text-[var(--color-text-primary)] bg-[var(--color-page-bg)] focus-visible:border-[var(--color-key)] focus-visible:ring-[var(--color-key)]/20 resize-none shadow-none"
      style={{ maxHeight: 120, overflowY: "hidden", fieldSizing: "fixed" }} />
    {streaming ? <Button type="button" variant="destructive" onClick={onStop} className="text-xs font-medium px-4 py-2.5 h-auto rounded-lg shrink-0">Stop</Button>
      : <Button type="submit" disabled={disabled || !value.trim()} className="text-xs font-medium px-4 py-2.5 h-auto rounded-lg shrink-0 bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] hover:bg-[var(--color-button-send-hover)] disabled:bg-[var(--color-button-send-disabled)] disabled:opacity-100">{lang === "en" ? "Send" : "전송"}</Button>}
  </form>;
}
