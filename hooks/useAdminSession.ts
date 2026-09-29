"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_SESSION_EXPIRED_EVENT, AdminRequestError } from "@/lib/admin/client";

export type AdminSessionStatus = "checking" | "authenticated" | "anonymous" | "error";

function clearLegacyPasswords() {
  try { localStorage.removeItem("admin_password"); } catch { /* storage may be unavailable */ }
  try { sessionStorage.removeItem("capture_password"); } catch { /* storage may be unavailable */ }
}

export function useAdminSession() {
  const [status, setStatus] = useState<AdminSessionStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setStatus("checking");
    setError(null);
    clearLegacyPasswords();
    try {
      const response = await fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" });
      if (response.ok) {
        let reply: unknown;
        try { reply = await response.json(); } catch { throw new AdminRequestError(502, "Invalid session response"); }
        if (!reply || typeof reply !== "object" || !("authenticated" in reply) || reply.authenticated !== true) throw new AdminRequestError(502, "Invalid session response");
        setStatus("authenticated");
      }
      else if (response.status === 401) setStatus("anonymous");
      else { setStatus("error"); setError("Server error. Please try again."); }
    } catch (error) {
      setStatus("error");
      setError(error instanceof AdminRequestError ? "Server error. Please try again." : "Network error. Please try again.");
    }
  }, []);

  useEffect(() => { void check(); }, [check]);
  useEffect(() => {
    const expired = () => { setStatus("anonymous"); setError("Your session has expired. Sign in again."); };
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, expired);
  }, []);

  const login = useCallback(async (password: string) => {
    clearLegacyPasswords();
    setError(null);
    let response: Response;
    try {
      response = await fetch("/api/admin/session", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      setError("Network error. Please try again.");
      throw new AdminRequestError(0, "Network error");
    }
    if (!response.ok) {
      const message = response.status === 401 ? "Invalid password." : response.status === 429 ? "Too many attempts. Please wait a minute." : "Server error. Please try again.";
      setError(message);
      throw new AdminRequestError(response.status, message);
    }
    try {
      const reply = await response.json();
      if (reply?.authenticated !== true) throw new Error("Invalid session response");
    } catch {
      setError("Server error. Please try again.");
      throw new AdminRequestError(502, "Invalid session response");
    }
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    clearLegacyPasswords();
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("Logout failed");
      setStatus("anonymous");
      setError(null);
    } catch {
      setError("Could not sign out. Please try again.");
      throw new AdminRequestError(0, "Logout failed");
    }
  }, []);

  return { status, error, login, logout, retry: check };
}
