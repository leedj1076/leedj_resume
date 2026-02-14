"use client";
import { useState } from "react";
import Link from "next/link";

const VERSIONS = [
  {
    slug: "v1-original",
    label: "V1",
    title: "Original",
    desc: "Production app — streaming chat, gateway modal, persona-aware RAG",
    tags: ["Streaming", "Gateway", "RAG"],
    accent: "#3b82f6",
    href: "/",
  },
  {
    slug: "v2-full-suite",
    label: "V2",
    title: "Full Suite",
    desc: "Gateway + 3 modes: Brief overview, Chat with evidence panel, Fit Analysis — dual theme, education, skills",
    tags: ["Fit Analysis", "Evidence Panel", "Dual Theme"],
    accent: "#8b5cf6",
  },
  {
    slug: "v3-narrative",
    label: "V3",
    title: "Narrative",
    desc: "Story-driven chapters with progressive reveal, serif typography, timeline markers",
    tags: ["Chapters", "Timeline", "Serif"],
    accent: "#f59e0b",
  },
  {
    slug: "v4-signal-deck",
    label: "V4",
    title: "Signal Deck",
    desc: "Presentation deck with snap-scroll sections, evidence-first framing, cinematic feel",
    tags: ["Scroll-snap", "Deck", "Cinematic"],
    accent: "#10b981",
  },
  {
    slug: "v5-merged",
    label: "V5",
    title: "Merged",
    desc: "No gateway — quick-scan grid, topic accordions, floating orbs, direct chat",
    tags: ["No Gateway", "Accordions", "Ambient"],
    accent: "#ec4899",
  },
];

export default function UIIndex() {
  const [preview, setPreview] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<(typeof VERSIONS)[0] | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white/90">
              Ask DJ — UI Lab
            </h1>
            <p className="text-[13px] text-white/40 mt-0.5">
              {VERSIONS.length} prototypes &middot; hover to preview, click to open
            </p>
          </div>
          <Link
            href="/"
            className="text-[13px] text-white/40 hover:text-white/70 transition-colors"
          >
            &larr; Back to app
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 flex gap-10">
        {/* Left: version cards */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            {VERSIONS.map((v) => {
              const url = v.href || `/ui/${v.slug}`;
              const active = preview === url;
              return (
                <Link
                  key={v.slug}
                  href={url}
                  className="block group"
                  onMouseEnter={() => {
                    setPreview(url);
                    setActiveVersion(v);
                  }}
                >
                  <div
                    className={`relative rounded-xl border px-5 py-4 transition-all duration-200 ${
                      active
                        ? "bg-white/[0.06] border-white/[0.12] shadow-lg"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Accent bar */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-opacity duration-200"
                      style={{
                        background: v.accent,
                        opacity: active ? 1 : 0,
                      }}
                    />

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded"
                            style={{
                              color: v.accent,
                              background: `${v.accent}15`,
                            }}
                          >
                            {v.label}
                          </span>
                          <span className="font-semibold text-[15px] text-white/90">
                            {v.title}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/40 mt-1.5 leading-relaxed">
                          {v.desc}
                        </p>
                        <div className="flex gap-1.5 mt-2.5">
                          {v.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] text-white/30 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span
                        className={`text-white/20 text-sm mt-1 transition-all duration-200 ${
                          active
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
                        }`}
                      >
                        &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="w-[520px] sticky top-8 self-start hidden lg:block">
          <div
            className="rounded-xl overflow-hidden relative border border-white/[0.08]"
            style={{
              width: 520,
              height: 340,
              background: activeVersion
                ? `linear-gradient(135deg, ${activeVersion.accent}08, transparent)`
                : "#111118",
            }}
          >
            {preview ? (
              <>
                <iframe
                  key={preview}
                  src={preview}
                  title="Preview"
                  style={{
                    width: 1560,
                    height: 1020,
                    transform: "scale(0.3333)",
                    transformOrigin: "top left",
                    border: "none",
                    pointerEvents: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                />
                {/* Top fade for label */}
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
                <div className="absolute top-2.5 left-3 flex items-center gap-2 pointer-events-none">
                  <span
                    className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color: activeVersion?.accent,
                      background: `${activeVersion?.accent}20`,
                    }}
                  >
                    {activeVersion?.label}
                  </span>
                  <span className="text-[11px] text-white/60">
                    {activeVersion?.title}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-white/20"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M3 9h18" />
                    <circle cx="7" cy="6" r="1" />
                    <circle cx="10" cy="6" r="1" />
                  </svg>
                </div>
                <span className="text-[13px] text-white/25">
                  Hover to preview
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
