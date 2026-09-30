import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminGate } from "@/components/admin/AdminGate";
import { adminRequest, adminTransportFetch } from "@/lib/admin/client";
import { z } from "zod";
import { DefaultChatTransport } from "ai";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("shows login for an anonymous session and opens the gate after a valid login without AI calls", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: false }), { status: 401 }))
    .mockResolvedValueOnce(Response.json({ authenticated: true }));
  vi.stubGlobal("fetch", fetcher);
  render(<AdminGate><div>Protected dashboard</div></AdminGate>);
  await screen.findByRole("button", { name: /sign in/i });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "correct" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await screen.findByText("Protected dashboard");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toBe("/api/admin/session");
});

it.each([500, 503])("shows server failure for %i instead of claiming bad credentials", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status })));
  render(<AdminGate><div>Protected dashboard</div></AdminGate>);
  expect(await screen.findByRole("alert")).toHaveTextContent(/server/i);
  expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
});

it("keeps the gate closed on a malformed successful session reply", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ authenticated: false })));
  render(<AdminGate><div>Protected dashboard</div></AdminGate>);
  expect(await screen.findByRole("alert")).toHaveTextContent(/server/i);
  expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
});

it("shows a network error and allows retry", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(new Response("{}", { status: 401 })));
  render(<AdminGate><div>Protected dashboard</div></AdminGate>);
  expect(await screen.findByRole("alert")).toHaveTextContent(/network/i);
  fireEvent.click(screen.getByRole("button", { name: /retry/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument());
});

it("shows invalid password only for a rejected login", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response("{}", { status: 401 })));
  render(<AdminGate><div>Protected dashboard</div></AdminGate>);
  await screen.findByRole("button", { name: /sign in/i });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/invalid password/i);
  expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
});

it("closes the gate when a later admin request finds an expired session", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ authenticated: true })).mockResolvedValueOnce(new Response("{}", { status: 401 })));
  function Protected() {
    return <button onClick={() => void adminRequest("/api/admin/stats", {}, z.object({ totalSessions: z.number() })).catch(() => {})}>Load stats</button>;
  }
  render(<AdminGate><Protected /></AdminGate>);
  fireEvent.click(await screen.findByRole("button", { name: /load stats/i }));
  await screen.findByRole("button", { name: /sign in/i });
  expect(screen.queryByRole("button", { name: /load stats/i })).not.toBeInTheDocument();
});

it.each(["/api/capture", "/api/chat"])("closes the gate when the %s transport receives 401", async (api) => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ authenticated: true }))
    .mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  const transport = new DefaultChatTransport({ api, fetch: adminTransportFetch });
  function Protected() {
    return <button onClick={() => void transport.sendMessages({
      trigger: "submit-message", chatId: "test", messageId: undefined,
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "test" }] }], abortSignal: undefined,
    }).catch(() => {})}>Send chat</button>;
  }
  render(<AdminGate><Protected /></AdminGate>);
  fireEvent.click(await screen.findByRole("button", { name: /send chat/i }));
  await screen.findByRole("button", { name: /sign in/i });
  expect(fetcher.mock.calls[1][0]).toBe(api);
});

it("still signs in and out when browser storage is unavailable", async () => {
  const storage = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValueOnce(Response.json({ authenticated: true }))
    .mockResolvedValueOnce(Response.json({ authenticated: false })));
  render(<AdminGate><div>Protected dashboard</div></AdminGate>);
  await screen.findByRole("button", { name: /sign in/i });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "correct" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await screen.findByText("Protected dashboard");
  fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
  await screen.findByRole("button", { name: /sign in/i });
  storage.mockRestore();
});
