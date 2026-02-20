"use client";

import { useState } from "react";
import { V14_PERSONA_OPTIONS } from "@/lib/profile-data";
import type { Lang } from "@/lib/profile-data";

interface V14WelcomeModalProps {
  onStart: (lang: Lang, persona: string) => void;
}

export default function V14WelcomeModal({ onStart }: V14WelcomeModalProps) {
  const [lang, setLang] = useState<Lang>("en");
  const [persona, setPersona] = useState<string | null>(null);
  const en = lang === "en";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[var(--color-page-bg)] border border-[var(--color-border-primary)] rounded-2xl shadow-xl max-w-[640px] w-full mx-4 px-16 py-12 animate-[scaleIn_0.3s_ease-out]">
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
        <div className="mb-10">
          <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)] tracking-tight leading-tight">
            {en ? "Welcome" : "환영합니다"}
          </h2>
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

        {/* Persona selection */}
        <div className="mb-8">
          <p className="text-[12px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-4">
            {en ? "I'm visiting as a..." : "저는..."}
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {V14_PERSONA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPersona(opt.value)}
                className={`py-2.5 text-[14px] rounded-lg border transition-colors cursor-pointer ${
                  persona === opt.value
                    ? "bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] border-[var(--color-surface-inverted)] font-medium"
                    : "bg-[var(--color-page-bg)] text-[var(--color-text-primary)] border-[var(--color-border-secondary)] hover:border-[var(--color-hover-border)]"
                }`}
              >
                {en ? opt.en : opt.kr}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          disabled={!persona}
          onClick={() => {
            if (persona) onStart(lang, persona);
          }}
          className="w-full py-3 text-[14px] font-medium rounded-lg transition-colors cursor-pointer bg-[var(--color-surface-inverted)] text-[var(--color-text-inverted)] hover:bg-[var(--color-button-send-hover)] disabled:bg-[var(--color-button-send-disabled)] disabled:text-[var(--color-text-muted)] disabled:cursor-default"
        >
          {en ? "Start" : "시작하기"}
        </button>

        {/* Footnote */}
        <p className="text-[11px] text-[var(--color-text-muted)] text-center mt-6 leading-relaxed">
          {en
            ? "Responses draw from verified data, though occasional imprecisions may occur. For the full picture, DJ welcomes a conversation in person."
            : "답변은 검증된 데이터에 기반하지만, 간혹 부정확할 수 있습니다. 보다 자세한 이야기는 직접 만나 들어보세요."}
        </p>
      </div>
    </div>
  );
}
