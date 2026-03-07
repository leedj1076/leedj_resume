"use client";

import { useState, useRef, useEffect } from "react";
import {
  STATS,
  TIMELINE,
  PORTFOLIO,
  localize,
  type Lang,
} from "@/lib/profile-data";
import { Button } from "@/components/ui/button";

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
          <h1 className="text-[28px] font-semibold text-[var(--color-text-primary)] tracking-[-0.03em] leading-tight">
            Dong Jae Lee
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
            {en ? "Founder-Operator | Early-Stage Tech & Startups" : "파운더-오퍼레이터 | 초기 스타트업 & 기술 생태계"}
          </p>
          <p className="text-[14px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
            {en
              ? "Built, scaled, and shut down an AI startup. 8+ years across enterprise data systems, spatial computing, and global platform partnerships (Apple, Meta, Google)."
              : "AI 스타트업을 구축, 성장, 그리고 종료까지 경험. 8년+ 엔터프라이즈 데이터 시스템, 공간 컴퓨팅, 글로벌 플랫폼 파트너십(Apple, Meta, Google) 경험."}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-px bg-[var(--color-border-primary)] rounded-[10px] overflow-hidden mb-10">
          {STATS.map((s, i) => (
            <button
              key={i}
              onClick={() => onAskChat(s.chatQ[lang])}
              className="flex flex-col items-start bg-[var(--color-profile-bg)] px-5 py-[18px] text-left hover:bg-[var(--color-hover-accent-bg)] transition-colors duration-150 cursor-pointer group"
            >
              <div className="text-[12px] font-normal text-[var(--color-text-tertiary)] uppercase tracking-[0.15em] mb-1">
                {localize(s.label, lang)}
              </div>
              <div className="text-[18px] font-semibold text-[var(--color-text-primary)] tracking-[-0.02em]">
                {localize(s.value, lang)}
              </div>
              <div className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5 leading-snug">
                {localize(s.detail, lang)}
              </div>
              <div className="text-[12px] font-medium text-[var(--color-key)] mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {en ? "Ask about this →" : "이것에 대해 질문 →"}
              </div>
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.2em]">
              {en ? "Career" : "경력"}
            </div>
            <a
              href="/DongJaeLee_Resume_2026.pdf"
              download
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-key)] hover:underline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {en ? "Resume PDF" : "이력서 PDF"}
            </a>
          </div>
          <div className="flex flex-col">
            {TIMELINE.map((t, i) => (
              <button
                key={i}
                onClick={() => onAskChat(t.chatQ[lang])}
                className="flex gap-4 text-left group cursor-pointer hover:bg-[var(--color-hover-accent-bg)] -mx-2 px-2 py-2.5 rounded-lg transition-colors"
                style={{
                  paddingBottom: i < TIMELINE.length - 1 ? 14 : 0,
                }}
              >
                {/* Dot + line */}
                <div className="flex flex-col items-center w-3 shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${
                      i === 0 ? "bg-[var(--color-key)]" : "bg-[var(--color-border-tertiary)]"
                    }`}
                  />
                  {i < TIMELINE.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--color-border-primary)] mt-1" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--color-text-tertiary)] font-medium mb-0.5">
                    {localize(t.period, lang)}
                  </div>
                  <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {localize(t.role, lang)}
                  </div>
                  <div className="text-[13px] text-[var(--color-text-secondary)] mt-px">
                    {localize(t.company, lang)}
                  </div>
                  <div className="text-[13px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
                    {localize(t.highlight, lang)}
                  </div>
                  <div className="text-[12px] font-medium text-[var(--color-key)] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {en ? "Ask about this →" : "이것에 대해 질문 →"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Work */}
        <div className="mb-10">
          <div className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.2em] mb-3.5">
            {en ? "Work Samples" : "작업 샘플"}
          </div>
          <div className="flex flex-col gap-5">
            {(() => {
              const groups: { company: string; items: typeof PORTFOLIO }[] = [];
              for (const p of PORTFOLIO) {
                const name = localize(p.company, lang);
                const last = groups[groups.length - 1];
                if (last && last.company === name) {
                  last.items.push(p);
                } else {
                  groups.push({ company: name, items: [p] });
                }
              }
              return groups.map((g) => (
                <div key={g.company}>
                  <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.15em] mb-2">
                    {g.company}
                  </div>
                  <div className="flex flex-col gap-2">
                    {g.items.map((p, i) => {
                      const isExternal = p.url.startsWith("http");
                      return (
                        <a
                          key={i}
                          href={p.url}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                          className="group flex items-start justify-between gap-3 border border-[var(--color-border-secondary)] rounded-lg px-4 py-3.5 no-underline hover:border-[var(--color-hover-border)] hover:bg-[var(--color-hover-accent-bg)] transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                              {p.title[lang]}
                            </div>
                            <div className="text-[13px] text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
                              {p.description[lang]}
                            </div>
                          </div>
                          <span className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-key)] transition-colors shrink-0 mt-0.5">
                            ↗
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-3 flex-wrap">
          <a
            href="https://www.linkedin.com/in/dongjae-lee/"
            target="_blank"
            rel="noopener noreferrer"
            title={en ? "View DJ's LinkedIn profile" : "DJ의 LinkedIn 프로필 보기"}
            className="text-[13px] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] rounded-md px-3 py-1.5 hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
          >
            LinkedIn
          </a>
          <a
            href="mailto:leedj.1076@gmail.com"
            title={en ? "Send DJ an email" : "DJ에게 이메일 보내기"}
            className="text-[13px] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] rounded-md px-3 py-1.5 hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
          >
            Email
          </a>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-5 border-t border-[var(--color-border-primary)]">
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            {en
              ? "Designed and vibe-coded by DJ with Claude Code, Next.js, Pinecone & Gemini. AI answers grounded in DJ's own Q&A database."
              : "해당 페이지는 Claude Code, Next.js, Pinecone & Gemini로 직접 설계하고 구현되었습니다. AI 답변은 DJ가 구축한 Q&A 데이터베이스에 기반합니다."}
          </p>
        </div>
      </div>

      {/* Bottom gradient */}
      {showBottomGradient && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--color-page-bg)] to-transparent pointer-events-none" />
      )}

      {/* Back to top */}
      {showBackToTop && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToTop}
          className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-[var(--color-profile-bg)] border-[var(--color-border-secondary)] shadow-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-hover-border)]"
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
        </Button>
      )}
    </div>
  );
}
