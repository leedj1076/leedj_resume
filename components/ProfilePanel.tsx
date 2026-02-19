"use client";

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

  return (
    <div className="profile-scroll h-full overflow-y-auto px-9 py-10">
      {/* Name & headline */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#1a1a1a] tracking-[-0.03em] leading-tight">
          Dong Jae Lee
        </h1>
        <p className="text-sm text-[#676767] mt-1.5 leading-relaxed">
          {en ? "Operator → Builder → Strategist" : "운영자 → 빌더 → 전략가"}
        </p>
        <p className="text-[13px] text-[#979797] mt-1 leading-relaxed">
          {en
            ? "Bridging deep tech and real-world business. 8+ years shipping products, closing enterprise deals, and building from zero to scale."
            : "딥테크와 실제 비즈니스를 연결합니다. 8년+ 제품 출시, 기업 딜 클로징, 제로에서 스케일까지 구축 경험."}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-[#f0f0f0] rounded-[10px] overflow-hidden mb-8">
        {STATS.map((s, i) => (
          <button
            key={i}
            onClick={() => onAskChat(s.chatQ[lang])}
            className="bg-white px-4 py-3.5 text-left hover:bg-[#f0fdf4] transition-colors duration-150 cursor-pointer group"
          >
            <div className="text-[10px] font-medium text-[#979797] uppercase tracking-wider mb-1">
              {localize(s.label, lang)}
            </div>
            <div className="text-[17px] font-semibold text-[#1a1a1a] tracking-[-0.02em]">
              {localize(s.value, lang)}
            </div>
            <div className="text-[11px] text-[#979797] mt-0.5 leading-snug">
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
        <div className="text-[10px] font-semibold text-[#979797] uppercase tracking-widest mb-3.5">
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
        <div className="text-[10px] font-semibold text-[#979797] uppercase tracking-widest mb-4">
          {en ? "Career" : "경력"}
        </div>
        <div className="flex flex-col">
          {TIMELINE.map((t, i) => (
            <button
              key={i}
              onClick={() => onAskChat(t.chatQ[lang])}
              className="flex gap-4 text-left group cursor-pointer hover:bg-[#fafafa] -mx-2 px-2 py-1 rounded-lg transition-colors"
              style={{
                paddingBottom: i < TIMELINE.length - 1 ? 20 : 0,
              }}
            >
              {/* Dot + line */}
              <div className="flex flex-col items-center w-3 shrink-0">
                <div
                  className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${
                    i === 0 ? "bg-green-500" : "bg-[#d6d6d6]"
                  }`}
                />
                {i < TIMELINE.length - 1 && (
                  <div className="w-px flex-1 bg-[#f0f0f0] mt-1" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#979797] font-medium mb-0.5">
                  {localize(t.period, lang)}
                </div>
                <div className="text-[13px] font-semibold text-[#1a1a1a]">
                  {localize(t.role, lang)}
                </div>
                <div className="text-xs text-[#676767] mt-px">
                  {localize(t.company, lang)}
                </div>
                <div className="text-[11.5px] text-[#979797] mt-1 leading-relaxed">
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
          href="https://linkedin.com/in/dongjaelee1076"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#676767] border border-[#e5e5e5] rounded-md px-3 py-1.5 hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors no-underline"
        >
          LinkedIn
        </a>
        <a
          href="mailto:leedj.1076@gmail.com"
          className="text-xs text-[#676767] border border-[#e5e5e5] rounded-md px-3 py-1.5 hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors no-underline"
        >
          Email
        </a>
        <a
          href="/ui"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#979797] border border-[#f0f0f0] rounded-md px-3 py-1.5 hover:border-[#d6d6d6] hover:text-[#676767] transition-colors no-underline"
        >
          {en ? "UI Lab" : "UI 랩"}
        </a>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-5 border-t border-[#f0f0f0]">
        <p className="text-[11px] text-[#b0b0b0] leading-relaxed">
          {en
            ? "This profile is a live RAG application — built by DJ with Next.js, Pinecone, and Gemini. The AI answers are grounded in verified professional data, not generated from thin air."
            : "이 프로필은 DJ가 Next.js, Pinecone, Gemini로 직접 구축한 라이브 RAG 애플리케이션입니다. AI 답변은 허공에서 생성된 것이 아닌 검증된 전문 데이터에 기반합니다."}
        </p>
      </div>
    </div>
  );
}
