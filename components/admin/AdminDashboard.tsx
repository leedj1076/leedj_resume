"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "./AdminGate";
import { ReviewTab, initialReviewWorkspace } from "./ReviewTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SettingsTab, initialSettingsDraft } from "./SettingsTab";

type Tab = "review" | "analytics" | "settings";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("review");
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewWorkspace, setReviewWorkspace] = useState(
    initialReviewWorkspace,
  );
  const [settingsDraft, setSettingsDraft] = useState(initialSettingsDraft);
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (wasDark) html.classList.add("dark");
    };
  }, []);
  return (
    <AdminGate
      onSignedOut={() => {
        setTab("review");
        setReviewWorkspace(initialReviewWorkspace());
        setSettingsDraft(initialSettingsDraft());
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Dashboard
              </h1>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                aria-label="Refresh data"
                title="Refresh data"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            </div>
            <div
              className="flex gap-1 bg-gray-100 p-1 rounded-lg"
              role="tablist"
              aria-label="Admin dashboard sections"
            >
              {(
                [
                  ["review", "Q&A Review"],
                  ["analytics", "Analytics"],
                  ["settings", "Settings"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-6">
          {tab === "review" ? (
            <ReviewTab
              refreshKey={refreshKey}
              workspace={reviewWorkspace}
              onWorkspaceChange={setReviewWorkspace}
            />
          ) : tab === "analytics" ? (
            <AnalyticsTab refreshKey={refreshKey} />
          ) : (
            <SettingsTab
              draft={settingsDraft}
              onDraftChange={setSettingsDraft}
            />
          )}
        </main>
      </div>
    </AdminGate>
  );
}
