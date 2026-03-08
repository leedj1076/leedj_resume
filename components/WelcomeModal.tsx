"use client";

import { useState } from "react";
import type { Persona, Focus, VisitorData } from "@/lib/types";

type Lang = "en" | "ko";

const PERSONA_OPTIONS: { value: Persona; en: string; ko: string }[] = [
  { value: "vc", en: "VC", ko: "VC" },
  { value: "founder", en: "Founder", ko: "창업자" },
  { value: "partner", en: "Partner", ko: "파트너" },
  { value: "curious_visitor", en: "Curious Visitor", ko: "방문자" },
];

const FOCUS_OPTIONS: { value: Focus; en: string; ko: string }[] = [
  { value: "business_development", en: "Business Development", ko: "사업 개발" },
  { value: "ai_llms", en: "AI / LLMs", ko: "AI / LLM" },
  { value: "leadership_strategy", en: "Leadership & Strategy", ko: "리더십 & 전략" },
  { value: "full_stack", en: "Full Overview", ko: "전체 보기" },
];

const LABELS = {
  en: {
    title: "Welcome! Tell me about yourself",
    personaLabel: "I am a...",
    focusLabel: "I'm interested in...",
    submit: "Start Chat \u2192",
    privacy: "Your questions help improve this AI. No personal data is collected.",
  },
  ko: {
    title: "환영합니다! 자기소개를 해주세요",
    personaLabel: "저는...",
    focusLabel: "관심 분야는...",
    submit: "대화 시작 \u2192",
    privacy: "질문은 AI 개선에 활용됩니다. 개인정보는 수집하지 않습니다.",
  },
} as const;

interface WelcomeModalProps {
  lang: Lang;
  onSubmit: (data: VisitorData) => void;
}

export default function WelcomeModal({ lang, onSubmit }: WelcomeModalProps) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const t = LABELS[lang];

  const canSubmit = persona !== null && focus !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-[scaleIn_0.3s_ease-out]">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          {t.title}
        </h2>

        {/* Persona selection */}
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">{t.personaLabel}</p>
          <div
            role="radiogroup"
            aria-label={t.personaLabel}
            className="flex flex-wrap gap-2"
          >
            {PERSONA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={persona === opt.value}
                tabIndex={0}
                onClick={() => setPersona(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  persona === opt.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                }`}
              >
                {opt[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Focus selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">{t.focusLabel}</p>
          <div
            role="radiogroup"
            aria-label={t.focusLabel}
            className="flex flex-wrap gap-2"
          >
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={focus === opt.value}
                tabIndex={0}
                onClick={() => setFocus(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  focus === opt.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                }`}
              >
                {opt[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          disabled={!canSubmit}
          onClick={() => {
            if (persona && focus) onSubmit({ persona, focus });
          }}
          className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t.submit}
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">{t.privacy}</p>
      </div>
    </div>
  );
}
