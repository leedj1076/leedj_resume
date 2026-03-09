"use client";

import { useState } from "react";
import ProfileAppLoader from "@/components/ProfileAppLoader";

export default function InternalPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      setAuthenticated(true);
      setAuthError(false);
    } catch {
      setAuthError(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
          <h1 className="text-xl font-semibold mb-1">Internal Testing</h1>
          <p className="text-sm text-gray-500 mb-4">RAG pipeline debugger with trace logs</p>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {authError && (
              <p className="text-sm text-red-600 mb-3">Invalid password</p>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <ProfileAppLoader internal />;
}
