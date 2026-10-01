"use client";

import { useState } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { PERSONA_OPTIONS } from "@/lib/domain/personas";
import type { AppSettings } from "@/lib/domain/admin";

type PersonaLabelMap = AppSettings["personaLabels"];

const MODES = [
  {
    id: "default",
    label: "Conversational",
    description:
      "Warm and natural — like chatting over coffee. Uses overview first, then goes deeper on follow-up questions.",
    example:
      "\"I've spent 15+ years bridging tech and business across Korea and the US...\n\n• **Samsung SDS** — Led a 40-person engineering team...\n• **Flint** — Co-founded and scaled to $2M ARR...\n\nWant me to dive deeper into any of these?\"",
  },
  {
    id: "pyramid",
    label: "Pyramid Principle",
    description:
      "Barbara Minto's framework — lead with the direct answer first, support with logically grouped arguments (MECE), back each with specific evidence.",
    example:
      "\"I bring 15+ years of cross-functional leadership across AI, BD, and venture capital.\n\n**Proven operator who scales revenue**\n• Built $2M ARR at Flint...\n• Drove $30M pipeline at Samsung...\n\n**Deep AI/LLM implementation experience**\n• Shipped 3 production AI systems...\n\n**Cross-cultural bridge between US and Korea**\n• Bilingual, led deals across both markets...\"",
  },
];

export function SettingsTab() {
  const { saved: settings, save, loading, saving, error, refresh } = useAdminSettings();
  const savedPersonas = settings?.visiblePersonas ?? PERSONA_OPTIONS.map((option) => option.value);
  const savedLabels = settings?.personaLabels ?? Object.fromEntries(PERSONA_OPTIONS.map((option) => [option.value, { en: option.en, kr: option.kr }]));
  const answerMode = settings?.mode ?? "default";
  const [draftPersonas, setDraftPersonas] = useState<string[] | null>(null);
  const [draftLabels, setDraftLabels] = useState<PersonaLabelMap | null>(null);
  const [personasSaved, setPersonasSaved] = useState(false);
  const [modeSaved, setModeSaved] = useState(false);
  const visibleDraft = draftPersonas ?? savedPersonas;
  const labelDraft = draftLabels ?? savedLabels;
  const onTogglePersona = (value: string) => {
    setPersonasSaved(false);
    setDraftPersonas((current) => {
      const list = current ?? savedPersonas;
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return next.length ? next : list;
    });
  };
  const onLabelChange = (value: string, lang: "en" | "kr", text: string) => {
    setPersonasSaved(false);
    setDraftLabels((current) => ({ ...(current ?? savedLabels), [value]: { ...(current ?? savedLabels)[value], [lang]: text } }));
  };
  const onApplyPersonaSettings = async () => {
    const result = await save({ visiblePersonas: visibleDraft as AppSettings["visiblePersonas"], personaLabels: labelDraft });
    if (result) { setDraftPersonas(result.visiblePersonas); setDraftLabels(result.personaLabels); }
    setPersonasSaved(Boolean(result));
  };
  const onModeChange = async (mode: string) => {
    setModeSaved(false);
    const result = await save({ mode: mode as AppSettings["mode"] });
    setModeSaved(Boolean(result));
  };
  if (loading && !settings) return <p className="text-center py-12 text-gray-400">Loading settings...</p>;
  if (!settings) return <p role="alert" className="text-sm text-red-700">{error ?? "Unable to load settings."} <button onClick={() => void refresh()} className="underline">Retry</button></p>;
  const visibilityDirty =
    visibleDraft.length !== savedPersonas.length ||
    [...visibleDraft].sort().join(",") !== [...savedPersonas].sort().join(",");
  const labelsDirty = PERSONA_OPTIONS.some(
    (o) =>
      labelDraft[o.value]?.en !== savedLabels[o.value]?.en ||
      labelDraft[o.value]?.kr !== savedLabels[o.value]?.kr
  );
  const personasDirty = visibilityDirty || labelsDirty;
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Persona Buttons
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Toggle which visitor types appear on the interactive profile (/dj) and
        edit their button labels (English / Korean). Hidden personas can&apos;t
        be selected by visitors; at least one must stay visible. Changes take
        effect when you click Apply.
      </p>

      <div className="flex items-center gap-3 px-1 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
        <span className="w-6 text-center">On</span>
        <span className="w-32 shrink-0">Persona</span>
        <span className="flex-1">English label</span>
        <span className="flex-1">Korean label</span>
      </div>

      <div className="space-y-2 mb-4">
        {PERSONA_OPTIONS.map((opt) => {
          const visible = visibleDraft.includes(opt.value);
          const isLastActive = visible && visibleDraft.length === 1;
          const label = labelDraft[opt.value] ?? { en: opt.en, kr: opt.kr };
          return (
            <div key={opt.value} className="flex items-center gap-3">
              <button
                aria-label={`${opt.en} visibility`}
                aria-pressed={visible}
                onClick={() => {
                  if (!saving && !isLastActive)
                    onTogglePersona(opt.value);
                }}
                disabled={saving || isLastActive}
                title={
                  visible
                    ? isLastActive
                      ? "At least one persona must stay visible"
                      : "Visible — click to hide"
                    : "Hidden — click to show"
                }
                className={`w-6 h-6 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                  visible
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 bg-white"
                } ${
                  saving || isLastActive
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {visible && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <code
                className="w-32 shrink-0 text-[11px] text-gray-400 truncate"
                title={opt.value}
              >
                {opt.value}
              </code>
              <input
                type="text"
                aria-label={`${opt.value} English label`}
                value={label.en}
                onChange={(e) => onLabelChange(opt.value, "en", e.target.value)}
                disabled={saving}
                placeholder={opt.en}
                className={`flex-1 min-w-0 px-2.5 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                  visible ? "border-gray-300" : "border-gray-200 text-gray-400"
                }`}
              />
              <input
                type="text"
                aria-label={`${opt.value} Korean label`}
                value={label.kr}
                onChange={(e) => onLabelChange(opt.value, "kr", e.target.value)}
                disabled={saving}
                placeholder={opt.kr}
                className={`flex-1 min-w-0 px-2.5 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                  visible ? "border-gray-300" : "border-gray-200 text-gray-400"
                }`}
              />
            </div>
          );
        })}
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {/* Apply — persona changes only take effect when this is clicked */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            if (personasDirty && !saving) onApplyPersonaSettings();
          }}
          disabled={!personasDirty || saving}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            personasDirty && !saving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? "Applying..." : "Apply"}
        </button>
        {personasDirty && !saving && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
        {personasSaved && !personasDirty && (
          <span className="text-sm text-green-600">
            Applied — live on the profile
          </span>
        )}
      </div>

      <div className="border-t border-gray-200 my-8" />

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Answer Mode
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Controls how the RAG system structures its responses. Applies to all
        chat endpoints (main app + UI prototypes).
      </p>

      <div className="space-y-3">
        {MODES.map((mode) => {
          const active = answerMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                if (!active && !saving) onModeChange(mode.id);
              }}
              disabled={saving}
              className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                active
                  ? "border-blue-500 bg-blue-50/50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      active ? "border-blue-500" : "border-gray-300"
                    }`}
                  >
                    {active && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {mode.label}
                  </span>
                </div>
                {active && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 ml-6.5 mb-3 ml-[26px]">
                {mode.description}
              </p>
              <div className="ml-[26px] bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                  Example output
                </p>
                <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed font-mono">
                  {mode.example}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status indicator */}
      <div className="mt-4 h-6 flex items-center">
        {saving && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {modeSaved && (
          <span className="text-sm text-green-600">
            Saved — new conversations will use this mode
          </span>
        )}
      </div>
    </div>
  );
}
