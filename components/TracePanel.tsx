"use client";

import { useState } from "react";
import type { TraceData, TraceStep } from "@/lib/types";

const STEP_COLORS: Record<string, string> = {
  "Query Processing": "bg-blue-500",
  "Entity Detection": "bg-indigo-500",
  "Query Rewrite Prompt": "bg-fuchsia-500",
  "Query Rewrite Result": "bg-pink-500",
  "Intent Classification": "bg-violet-500",
  "Early Return": "bg-amber-500",
  "Embedding": "bg-cyan-500",
  "Retrieval": "bg-emerald-500",
  "Direct Match": "bg-orange-500",
  "Re-ranking": "bg-teal-500",
  "Context Assembly": "bg-sky-500",
  "Generation": "bg-purple-500",
};

// --- Human-readable detail renderers per step type ---

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 w-[80px] shrink-0 font-medium">{label}</span>
      <span className="text-[11px] text-gray-700 dark:text-gray-300 break-all">{children}</span>
    </div>
  );
}

function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function PromptBlock({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const lines = text.split("\n").length;
  const chars = text.length;
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${open ? "rotate-90" : ""}`}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {label}
        <span className="text-gray-300 dark:text-gray-600 font-normal">({lines} lines, {chars.toLocaleString()} chars)</span>
      </button>
      {open && (
        <pre className="mt-1.5 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[10px] text-gray-600 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
          {text}
        </pre>
      )}
    </div>
  );
}

function QueryProcessingDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div>
      <Row label="Query">&ldquo;{String(data.rawQuery)}&rdquo;</Row>
      <Row label="Persona"><Pill color="violet">{String(data.persona)}</Pill></Row>
      <Row label="Focus"><Pill color="blue">{String(data.focus)}</Pill></Row>
      <Row label="Language"><Pill>{String(data.lang)}</Pill></Row>
      <Row label="History">{String(data.messageCount)} messages in conversation</Row>
    </div>
  );
}

function EntityDetectionDetail({ data }: { data: Record<string, unknown> }) {
  const detected = data.detected as Record<string, unknown> | null;
  if (!detected) {
    return <p className="text-[11px] text-gray-400 italic">No entities detected in query</p>;
  }
  return (
    <div>
      <Row label="Type"><Pill color="blue">{String(detected.type)}</Pill></Row>
      {"value" in detected && <Row label="Value"><Pill color="green">{String(detected.value)}</Pill></Row>}
      {"filter" in detected && <Row label="Filter"><code className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{JSON.stringify(detected.filter)}</code></Row>}
    </div>
  );
}

function IntentDetail({ data }: { data: Record<string, unknown> }) {
  const intentColor = data.intent === "specific" ? "green" : data.intent === "broad" ? "blue" : "amber";
  return (
    <div>
      <Row label="Intent"><Pill color={intentColor}>{String(data.intent)}</Pill></Row>
      <Row label="Search query">&ldquo;{String(data.retrievalQuery)}&rdquo;</Row>
      {Boolean(data.hasConversationContext) && <Row label="Context">Using conversation history for context</Row>}
      {Array.isArray(data.clarifications) && data.clarifications.length > 0 && (
        <Row label="Clarifications">
          <ul className="list-disc list-inside">
            {(data.clarifications as string[]).map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Row>
      )}
    </div>
  );
}

function EarlyReturnDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div>
      <Row label="Reason"><Pill color="amber">Ambiguous query — skipping retrieval</Pill></Row>
      {Array.isArray(data.clarifications) && (
        <Row label="Asked user">
          <ul className="list-disc list-inside">
            {(data.clarifications as string[]).map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Row>
      )}
    </div>
  );
}

function EmbeddingDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div>
      <Row label="Model"><Pill color="blue">{String(data.model)}</Pill></Row>
      <Row label="Input">{String(data.queryLength)} characters</Row>
      <Row label="Output">{String(data.embeddingDimensions)}-dimensional vector</Row>
    </div>
  );
}

function RetrievalDetail({ data }: { data: Record<string, unknown> }) {
  const topScores = (data.topScores ?? []) as Array<{ id: string; score: number; section: string }>;
  const pinnedIds = (data.pinnedIds ?? []) as string[];
  return (
    <div>
      <Row label="Total chunks"><span className="font-semibold">{String(data.totalChunks)}</span> chunks retrieved</Row>
      <Row label="Filter">
        {data.filterType === "none"
          ? <span className="text-gray-400">none (semantic only)</span>
          : <><Pill color="blue">{String(data.filterType)}</Pill>{data.filterValue && <span className="ml-1">= {String(data.filterValue)}</span>}</>}
      </Row>
      <Row label="Focus filter">{data.hasFocusFilter ? <Pill color="green">active</Pill> : <span className="text-gray-400">none</span>}</Row>
      <Row label="Pinned">
        <div className="flex flex-wrap gap-1">
          {pinnedIds.map((id) => <Pill key={id}>{id}</Pill>)}
        </div>
      </Row>
      {topScores.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1">Top matches by Pinecone score:</p>
          <div className="space-y-1">
            {topScores.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(c.score * 100, 100)}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-500 w-10">{c.score.toFixed(3)}</span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{c.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectMatchDetail({ data }: { data: Record<string, unknown> }) {
  if (!data.found) {
    return <p className="text-[11px] text-gray-400 italic">No direct Q&A match — using standard retrieval</p>;
  }
  return (
    <div>
      <Row label="Status"><Pill color="green">Direct match found</Pill></Row>
      <Row label="Chunk"><code className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{String(data.matchId)}</code></Row>
      <Row label="Score">
        <span className="font-semibold">{Number(data.matchScore).toFixed(3)}</span>
        {Number(data.matchScore) >= 0.90 && <Pill color="green">high confidence</Pill>}
      </Row>
      <Row label="Question">&ldquo;{String(data.matchQuestion)}&rdquo;</Row>
    </div>
  );
}

function RerankingDetail({ data }: { data: Record<string, unknown> }) {
  const topChunks = (data.topChunks ?? []) as Array<{
    id: string; label: string; section: string; pineconeScore: number; personaMultiplier: number;
  }>;
  return (
    <div>
      <Row label="Input">{String(data.inputCount)} chunks</Row>
      <Row label="Output">{String(data.outputCount)} chunks (top 15)</Row>
      {topChunks.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1.5">Re-ranked results:</p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left font-medium py-0.5 pr-2">Chunk</th>
                <th className="text-right font-medium py-0.5 px-1 w-12">Score</th>
                <th className="text-right font-medium py-0.5 pl-1 w-8">Mult</th>
              </tr>
            </thead>
            <tbody>
              {topChunks.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="py-1 pr-2">
                    <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
                    <span className="text-gray-300 dark:text-gray-600 ml-1">({c.section})</span>
                  </td>
                  <td className="text-right py-1 px-1 font-mono text-gray-500">{c.pineconeScore.toFixed(3)}</td>
                  <td className="text-right py-1 pl-1 font-mono">
                    <span className={c.personaMultiplier > 1 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}>
                      {c.personaMultiplier > 1 ? `${c.personaMultiplier.toFixed(2)}x` : "1x"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ContextAssemblyDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div>
      <Row label="Mode">
        <Pill color={data.mode === "direct_match" ? "green" : "blue"}>
          {data.mode === "direct_match" ? "Direct match" : "Standard retrieval"}
        </Pill>
      </Row>
      <Row label="Overview">{String(data.overviewChunks)} chunks</Row>
      <Row label="Deep-dive">{String(data.deepDiveChunks)} chunks</Row>
      <Row label="Context size">{Number(data.contextLength).toLocaleString()} characters sent to LLM</Row>
    </div>
  );
}

function QueryRewritePromptDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div>
      <Row label="Target"><Pill color="blue">gpt-5.4</Pill></Row>
      <PromptBlock label="Full prompt" text={String(data.prompt)} />
    </div>
  );
}

function QueryRewriteResultDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <div>
      <Row label="Original">&ldquo;{String(data.originalQuery)}&rdquo;</Row>
      <Row label="Rewritten">&ldquo;{String(data.rewrittenQuery)}&rdquo;</Row>
      <PromptBlock label="Raw LLM output" text={String(data.rawResult)} />
    </div>
  );
}

function GenerationDetail({ data }: { data: Record<string, unknown> }) {
  const modeColor = data.responseMode === "direct_match" ? "green" : data.responseMode === "overview" ? "blue" : "gray";
  return (
    <div>
      <Row label="Model"><Pill color="violet">{String(data.model)}</Pill></Row>
      <Row label="Mode">
        <Pill color={modeColor}>
          {data.responseMode === "direct_match" ? "Direct match" : data.responseMode === "overview" ? "Overview (broad)" : "Standard"}
        </Pill>
      </Row>
      <Row label="Answer mode"><Pill>{String(data.answerMode)}</Pill></Row>
      <Row label="Temperature">{String(data.temperature)}</Row>
      <Row label="Max tokens">{Number(data.maxOutputTokens).toLocaleString()}</Row>
      <Row label="Context">{Number(data.contextLength).toLocaleString()} chars</Row>
      {data.systemPrompt ? <PromptBlock label="System prompt" text={String(data.systemPrompt)} /> : null}
    </div>
  );
}

const DETAIL_RENDERERS: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  "Query Processing": QueryProcessingDetail,
  "Entity Detection": EntityDetectionDetail,
  "Query Rewrite Prompt": QueryRewritePromptDetail,
  "Query Rewrite Result": QueryRewriteResultDetail,
  "Intent Classification": IntentDetail,
  "Early Return": EarlyReturnDetail,
  "Embedding": EmbeddingDetail,
  "Retrieval": RetrievalDetail,
  "Direct Match": DirectMatchDetail,
  "Re-ranking": RerankingDetail,
  "Context Assembly": ContextAssemblyDetail,
  "Generation": GenerationDetail,
};

function TraceStepItem({ step, isLast, duration }: { step: TraceStep; isLast: boolean; duration: number }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = STEP_COLORS[step.label] ?? "bg-gray-400";
  const DetailRenderer = DETAIL_RENDERERS[step.label];

  return (
    <div className="relative pl-6">
      {!isLast && (
        <div className="absolute left-[7px] top-[18px] bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      )}
      <div className={`absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full ${dotColor} ring-2 ring-white dark:ring-gray-900 flex items-center justify-center`}>
        <div className="w-[5px] h-[5px] rounded-full bg-white" />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
            {step.label}
          </span>
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
            {duration > 0 ? `${duration}ms` : "<1ms"}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`text-gray-300 dark:text-gray-600 transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          {step.summary}
        </p>
      </button>

      {expanded && (
        <div className="mt-1.5 mb-1 p-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          {DetailRenderer ? (
            <DetailRenderer data={step.data} />
          ) : (
            <pre className="text-[10px] text-gray-600 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
              {JSON.stringify(step.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="h-3" />
    </div>
  );
}

export default function TracePanel({
  trace,
  messageId,
}: {
  trace: TraceData | null | undefined;
  messageId?: string;
}) {
  if (!trace) {
    return (
      <aside className="w-[380px] min-w-[320px] border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 overflow-y-auto hidden lg:flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">RAG Trace</h3>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
            Ask a question to see the RAG pipeline trace here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[380px] min-w-[320px] border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 overflow-y-auto hidden lg:flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">RAG Trace</h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {trace.steps.length} steps in {trace.totalDurationMs}ms
          </p>
        </div>
        {messageId && (
          <span className="text-[9px] font-mono text-gray-300 dark:text-gray-600 truncate max-w-[100px]">
            {messageId.slice(0, 8)}
          </span>
        )}
      </div>

      <div className="px-4 py-4 flex-1">
        {trace.steps.map((step, i) => {
          const nextTimestamp = trace.steps[i + 1]?.timestamp ?? trace.totalDurationMs;
          const duration = nextTimestamp - step.timestamp;
          return (
            <TraceStepItem
              key={`${step.label}-${i}`}
              step={step}
              isLast={i === trace.steps.length - 1}
              duration={duration}
            />
          );
        })}
      </div>

      {/* Duration bar */}
      <div className="px-4 pb-4 shrink-0">
        <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-1.5 font-medium">Time distribution</p>
        <div className="flex items-center gap-0.5 h-2">
          {trace.steps.map((step, i) => {
            const nextTimestamp = trace.steps[i + 1]?.timestamp ?? trace.totalDurationMs;
            const duration = nextTimestamp - step.timestamp;
            const widthPct = Math.max((duration / trace.totalDurationMs) * 100, 2);
            const dotColor = STEP_COLORS[step.label] ?? "bg-gray-400";
            return (
              <div
                key={i}
                className={`${dotColor} rounded-sm h-full opacity-70 hover:opacity-100 transition-opacity cursor-default`}
                style={{ width: `${widthPct}%` }}
                title={`${step.label}: ${duration}ms`}
              />
            );
          })}
        </div>
      </div>
    </aside>
  );
}
