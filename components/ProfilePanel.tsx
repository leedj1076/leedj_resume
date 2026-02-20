"use client";

import { useState, useRef, useEffect } from "react";
import {
  STATS,
  HIGHLIGHTS,
  TIMELINE,
  localize,
  type Lang,
} from "@/lib/profile-data";
import HighlightCard from "./HighlightCard";

interface ProfilePanelProps {
  lang: Lang;
  onAskChat: (question: string) => void;
}

export default function ProfilePanel({ lang, onAskChat }: ProfilePanelProps) {
  const en = lang === "en";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowBackToTop(el.scrollTop > 200);
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
      setShowBottomGradient(!atBottom && el.scrollHeight > el.clientHeight);
    };
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="profile-scroll h-full overflow-y-auto px-9 py-10"
      >
        {/* Name & headline */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] tracking-[-0.03em] leading-tight">
            Dong Jae Lee
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
            {en ? "Operator → Builder → Strategist" : "운영자 → 빌더 → 전략가"}
          </p>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
            {en
              ? "Bridging deep tech and real-world business. 8+ years shipping products, closing enterprise deals, and building from zero to scale."
              : "딥테크와 실제 비즈니스를 연결합니다. 8년+ 제품 출시, 기업 딜 클로징, 제로에서 스케일까지 구축 경험."}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-px bg-[var(--color-border-primary)] rounded-[10px] overflow-hidden mb-8">
          {STATS.map((s, i) => (
            <button
              key={i}
              onClick={() => onAskChat(s.chatQ[lang])}
              className="bg-[var(--color-page-bg)] px-4 py-3.5 text-left hover:bg-[var(--color-hover-green-bg)] transition-colors duration-150 cursor-pointer group"
            >
              <div className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
                {localize(s.label, lang)}
              </div>
              <div className="text-[17px] font-semibold text-[var(--color-text-primary)] tracking-[-0.02em]">
                {localize(s.value, lang)}
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 leading-snug">
                {localize(s.detail, lang)}
              </div>
              <div className="text-[10px] text-green-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {en ? "Ask about this →" : "이것에 대해 질문 →"}
              </div>
            </button>
          ))}
        </div>

        {/* Highlights — narrative depth */}
        <div className="mb-8">
          <div className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-3.5">
            {en ? "In My Own Words" : "제 이야기"}
          </div>
          <div className="flex flex-col gap-2.5">
            {HIGHLIGHTS.map((h) => (
              <HighlightCard
                key={h.id}
                title={h.title[lang]}
                text={h.text[lang]}
              />
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <div className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-4">
            {en ? "Career" : "경력"}
          </div>
          <div className="flex flex-col">
            {TIMELINE.map((t, i) => (
              <button
                key={i}
                onClick={() => onAskChat(t.chatQ[lang])}
                className="flex gap-4 text-left group cursor-pointer hover:bg-[var(--color-surface-secondary)] -mx-2 px-2 py-1 rounded-lg transition-colors"
                style={{
                  paddingBottom: i < TIMELINE.length - 1 ? 20 : 0,
                }}
              >
                {/* Dot + line */}
                <div className="flex flex-col items-center w-3 shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${
                      i === 0 ? "bg-green-500" : "bg-[var(--color-border-tertiary)]"
                    }`}
                  />
                  {i < TIMELINE.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--color-border-primary)] mt-1" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium mb-0.5">
                    {localize(t.period, lang)}
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {localize(t.role, lang)}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-px">
                    {localize(t.company, lang)}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
                    {localize(t.highlight, lang)}
                  </div>
                  <div className="text-[10px] text-green-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {en ? "Ask about this →" : "이것에 대해 질문 →"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-3 flex-wrap">
          <a
            href="https://www.linkedin.com/in/dongjae-lee/"
            target="_blank"
            rel="noopener noreferrer"
            title={en ? "View DJ's LinkedIn profile" : "DJ의 LinkedIn 프로필 보기"}
            className="text-xs text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] rounded-md px-3 py-1.5 hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
          >
            LinkedIn
          </a>
          <a
            href="mailto:leedj.1076@gmail.com"
            title={en ? "Send DJ an email" : "DJ에게 이메일 보내기"}
            className="text-xs text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] rounded-md px-3 py-1.5 hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
          >
            Email
          </a>
          <a
            href="/ui"
            target="_blank"
            rel="noopener noreferrer"
            title={en ? "Explore UI prototypes" : "UI 프로토타입 탐색"}
            className="text-xs text-[var(--color-text-tertiary)] border border-[var(--color-border-primary)] rounded-md px-3 py-1.5 hover:border-[var(--color-border-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors no-underline"
          >
            {en ? "UI Lab" : "UI 랩"}
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-[var(--color-border-primary)]">
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            {en
              ? "This profile is a live RAG application — built by DJ with Next.js, Pinecone, and Gemini. The AI answers are grounded in verified professional data, not generated from thin air."
              : "이 프로필은 DJ가 Next.js, Pinecone, Gemini로 직접 구축한 라이브 RAG 애플리케이션입니다. AI 답변은 허공에서 생성된 것이 아닌 검증된 전문 데이터에 기반합니다."}
          </p>
        </div>
      </div>

      {/* Bottom gradient */}
      {showBottomGradient && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--color-page-bg)] to-transparent pointer-events-none" />
      )}

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-[var(--color-page-bg)] border border-[var(--color-border-secondary)] shadow-sm flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-hover-border)] transition-colors cursor-pointer"
          title={en ? "Back to top" : "맨 위로"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
