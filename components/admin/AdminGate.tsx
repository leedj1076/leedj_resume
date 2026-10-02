"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAdminSession } from "@/hooks/useAdminSession";

export function AdminGate({
  children,
  onSignedOut,
}: {
  children: ReactNode;
  onSignedOut?: () => void;
}) {
  const { status, error, login, logout, retry } = useAdminSession();
  const [password, setPassword] = useState("");

  if (status === "checking")
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking session...
      </div>
    );
  if (status === "error")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p role="alert">{error}</p>
        <button onClick={() => void retry()}>Retry</button>
      </div>
    );
  if (status === "anonymous") {
    const submit = (event: FormEvent) => {
      event.preventDefault();
      void login(password)
        .then(() => setPassword(""))
        .catch(() => {});
    };
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <form
          onSubmit={submit}
          className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm"
        >
          <h1 className="text-xl font-semibold mb-4">Admin sign in</h1>
          <label htmlFor="admin-password" className="block text-sm mb-2">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-3"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 mb-3">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-lg"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }
  return (
    <>
      <div className="absolute right-4 top-2 z-50">
        <button
          onClick={() =>
            void logout()
              .then(onSignedOut)
              .catch(() => {})
          }
          className="text-sm underline"
        >
          Sign out
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
      {children}
    </>
  );
}
