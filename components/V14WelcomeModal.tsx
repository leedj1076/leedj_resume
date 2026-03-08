"use client";

import { useState } from "react";
import { V14_PERSONA_OPTIONS } from "@/lib/profile-data";
import type { Lang } from "@/lib/profile-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface V14WelcomeModalProps {
  onStart: (lang: Lang, persona: string, email?: string) => void;
}

export default function V14WelcomeModal({ onStart }: V14WelcomeModalProps) {
  const [lang, setLang] = useState<Lang>("en");
  const [persona, setPersona] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const en = lang === "en";

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[720px] sm:max-w-[720px] px-20 py-12 rounded-2xl bg-[var(--color-page-bg)] border-[var(--color-border-primary)]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Language toggle */}
        <div className="flex justify-end mb-7">
          <div className="inline-flex border border-[var(--color-border-secondary)] rounded-[5px] overflow-hidden">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-[12px] border-none cursor-pointer transition-colors duration-150 ${
                lang === "en"
                  ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] font-semibold"
                  : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] font-normal"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("kr")}
              className={`px-3 py-1 text-[12px] border-none cursor-pointer transition-colors duration-150 ${
                lang === "kr"
                  ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] font-semibold"
                  : "bg-[var(--color-page-bg)] text-[var(--color-text-tertiary)] font-normal"
              }`}
            >
              KO
            </button>
          </div>
        </div>

        {/* Header */}
        <DialogHeader className="mb-10 gap-0 text-left">
          <DialogTitle className="text-[22px] font-semibold text-[var(--color-text-primary)] tracking-tight leading-tight">
            {en ? "Welcome" : "환영합니다"}
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              <p className="text-[15px] text-[var(--color-text-secondary)] mt-4 leading-[1.8]">
                {en
                  ? "This is a digital portrait of DJ Lee — an AI grounded in his verified career data, professional experience, and personal reflections."
                  : "이동재의 디지털 프로필입니다 — 검증된 경력 데이터와 본인의 경험, 회고를 바탕으로 답변하는 AI입니다."}
              </p>
              <p className="text-[14px] text-[var(--color-text-tertiary)] mt-2.5 leading-[1.8]">
                {en
                  ? "Browse his background on the left, or ask the AI on the right anything about his career."
                  : "왼쪽에서 이력을 둘러보거나, 오른쪽 AI에게 커리어에 대해 무엇이든 물어보세요."}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Persona selection */}
        <div className="mb-8">
          <p className="text-[12px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-4">
            {en ? "I'm visiting as a..." : "저는..."}
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {V14_PERSONA_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                onClick={() => setPersona(opt.value)}
                className={`py-2.5 h-auto text-[14px] rounded-lg whitespace-normal ${
                  persona === opt.value
                    ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] border-[var(--color-surface-inverted)] font-medium hover:bg-[var(--color-surface-inverted)] hover:text-[var(--color-text-inverted)]"
                    : "bg-[var(--color-page-bg)] text-[var(--color-text-primary)] border-[var(--color-border-secondary)] hover:border-[var(--color-hover-border)]"
                }`}
              >
                {en ? opt.en : opt.kr}
              </Button>
            ))}
          </div>
        </div>

        {/* Disclaimer + Email */}
        <div className="mb-6">
          <p className="text-[12px] text-[var(--color-text-tertiary)] leading-[1.7] mb-3">
            {en
              ? "Answers are generated and may contain inaccuracies. To ensure you have correct information, feel free to leave your email — I'll follow up with any corrections."
              : "답변은 자동 생성되며 부정확할 수 있습니다. 정확한 정보를 전달드리기 위해 이메일을 남겨주시면 수정 사항을 보내드리겠습니다."}
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[var(--color-border-secondary)] bg-[var(--color-page-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-hover-border)] transition-colors"
          />
        </div>

        {/* Start button */}
        <Button
          disabled={!persona}
          onClick={() => {
            if (persona) onStart(lang, persona, email.trim() || undefined);
          }}
          className="w-full py-3 h-auto text-[14px] font-medium rounded-lg bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] hover:bg-[var(--color-button-send-hover)] disabled:bg-[var(--color-button-send-disabled)] disabled:text-[var(--color-text-muted)] disabled:opacity-100"
        >
          {en ? "Start" : "시작하기"}
        </Button>

        {/* Footnote */}
        <p className="text-[11px] text-[var(--color-text-muted)] text-center mt-6 leading-relaxed">
          {en
            ? "Responses draw from verified data, though occasional imprecisions may occur. For the full picture, DJ welcomes a conversation in person."
            : "답변은 검증된 데이터에 기반하지만, 간혹 부정확할 수 있습니다. 보다 자세한 이야기는 직접 만나 들어보세요."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
