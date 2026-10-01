"use client";

import { useEffect } from "react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { ADMIN_PERSONA_LABELS } from "@/lib/admin/persona-labels";

export function AnalyticsTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data: stats, loading, error, refresh } = useAdminStats();
  useEffect(() => { if (refreshKey) void refresh(); }, [refreshKey, refresh]);
  if (error) return <div role="alert" className="text-sm text-red-700">{error} <button onClick={() => void refresh()} className="underline">Retry</button></div>;
  if (loading || !stats) {
    return (
      <div className="text-center py-12 text-gray-400">
        {loading ? "Loading analytics..." : "No data"}
      </div>
    );
  }

  const maxDaily = Math.max(
    ...Object.values(stats.dailySessions),
    ...Object.values(stats.dailyExchanges),
    1
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Sessions" value={stats.totalSessions} />
        <SummaryCard label="Total Exchanges" value={stats.totalExchanges} />
        <SummaryCard label="Avg per Session" value={stats.avgExchangesPerSession} color="blue" />
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Reviewed / Unreviewed</p>
          <p className="text-2xl font-semibold">
            <span className="text-green-700">{stats.reviewed}</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-orange-600">{stats.unreviewed}</span>
          </p>
        </div>
      </div>

      {/* Distribution sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DistributionCard
          title="Persona Distribution (by session)"
          data={stats.personaCounts}
          labels={ADMIN_PERSONA_LABELS}
          color="blue"
        />
        <DistributionCard
          title="Focus Area Distribution (by session)"
          data={Object.fromEntries(
            Object.entries(stats.focusCounts).filter(([k]) => k !== "full_stack")
          )}
          color="purple"
        />
        <DistributionCard
          title="Rating Distribution (by exchange)"
          data={stats.ratingCounts}
          labels={{ good: "Good", needs_improvement: "Needs Improvement", unrated: "Unrated" }}
          color="green"
        />
        <DistributionCard
          title="Language Distribution (by session)"
          data={stats.langCounts}
          labels={{ en: "English", ko: "Korean" }}
          color="indigo"
        />
      </div>

      {/* Daily volume chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Daily Volume (Last 14 Days)
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
              Sessions
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-300" />
              Exchanges
            </span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-32">
          {Object.keys(stats.dailySessions).map((day) => {
            const sessions = stats.dailySessions[day] ?? 0;
            const exchanges = stats.dailyExchanges[day] ?? 0;
            return (
              <div
                key={day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs text-gray-500">
                  {exchanges || sessions ? `${sessions}/${exchanges}` : ""}
                </span>
                <div className="w-full flex gap-[1px] items-end" style={{ height: `${(Math.max(sessions, exchanges) / maxDaily) * 100}%`, minHeight: (sessions > 0 || exchanges > 0) ? "4px" : "0px" }}>
                  <div
                    className="flex-1 bg-blue-600 rounded-t"
                    style={{
                      height: sessions > 0 ? `${(sessions / Math.max(sessions, exchanges)) * 100}%` : "0px",
                      minHeight: sessions > 0 ? "4px" : "0px",
                    }}
                  />
                  <div
                    className="flex-1 bg-blue-300 rounded-t"
                    style={{
                      height: exchanges > 0 ? `${(exchanges / Math.max(sessions, exchanges)) * 100}%` : "0px",
                      minHeight: exchanges > 0 ? "4px" : "0px",
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
                  {day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    gray: "text-gray-900",
    green: "text-green-700",
    orange: "text-orange-600",
    blue: "text-blue-700",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${colors[color] ?? colors.gray}`}>
        {value}
      </p>
    </div>
  );
}

function DistributionCard({
  title,
  data,
  labels,
  color = "blue",
}: {
  title: string;
  data: Record<string, number>;
  labels?: Record<string, string>;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-400",
    purple: "bg-purple-400",
    green: "bg-green-400",
    indigo: "bg-indigo-400",
  };
  const barColor = colorMap[color] ?? colorMap.blue;
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data)
          .sort(([, a], [, b]) => b - a)
          .map(([key, count]) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>{labels?.[key] ?? key}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
