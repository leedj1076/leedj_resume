import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { useAdminStats } from "@/hooks/useAdminStats";
import { ReviewEditor } from "@/components/admin/ReviewEditor";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { ReviewTab } from "@/components/admin/ReviewTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import AdminDashboardPage from "@/app/admin/dashboard/page";
import type { Exchange } from "@/lib/domain/admin";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const exchange: Exchange = {
  id: 42, created_at: "2026-09-29T00:00:00Z", session_id: "s1", persona: "vc", focus: "full_stack", lang: "en",
  query: "Question", response: "Answer", chunks_used: [], visitor_email: null, source: null,
  dj_rating: null, dj_comment: null, improvement_text: null, pinecone_chunk_id: null, reviewed_at: null,
  correction_status: "none", correction_error: null,
};
const page = (id: string) => ({ sessions: [{ session_id: id, persona: "vc", focus: "full_stack", lang: "en", started_at: "2026-09-29T00:00:00Z", visitor_email: null, source: null, exchanges: [{ ...exchange, session_id: id }] }], totalSessions: 1, page: 1, pageSize: 10 });
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>((done) => { resolve = done; }), resolve }; }

it("keeps only the newest filter response when requests finish in reverse order", async () => {
  const a = deferred<Response>(); const b = deferred<Response>();
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => a.promise).mockImplementationOnce(() => b.promise));
  const { result, rerender } = renderHook(({ filter }) => useAdminSessions({ page: 1, filter }), { initialProps: { filter: "all" as "all" | "reviewed" } });
  rerender({ filter: "reviewed" });
  await act(async () => { b.resolve(Response.json(page("new"))); });
  expect(result.current.data).toEqual(page("new"));
  await act(async () => { a.resolve(Response.json(page("old"))); });
  expect(result.current.data).toEqual(page("new"));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
});

it.each([500, 502])("shows session load errors for HTTP %i without exposing bad rows", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
  const { result } = renderHook(() => useAdminSessions({ page: 1, filter: "all" }));
  await waitFor(() => expect(result.current.error).toMatch(/server/i));
  expect(result.current.data).toBeNull();
});

it("rejects malformed statistics instead of rendering them", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ totalSessions: "many" })));
  const { result } = renderHook(() => useAdminStats());
  await act(async () => { await result.current.refresh(); });
  expect(result.current.data).toBeNull();
  expect(result.current.error).toMatch(/invalid server response/i);
});

it("does not render analytics cards from invalid JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{", { status: 200, headers: { "Content-Type": "application/json" } })));
  render(<AnalyticsTab />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/invalid server response/i);
  expect(screen.queryByText("Total Sessions")).not.toBeInTheDocument();
});

it("keeps the review draft open on network failure and never claims it was saved", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<ReviewEditor exchange={exchange} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Needs Improvement" }));
  fireEvent.change(screen.getByRole("textbox", { name: /improved answer/i }), { target: { value: "Keep this answer" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/network/i);
  expect(screen.getByRole("textbox", { name: /improved answer/i })).toHaveValue("Keep this answer");
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("shows retry guidance for a persisted review whose embedding failed", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: false, pineconeChunkId: null, correctionStatus: "failed", correctionError: "Review saved, but correction indexing failed. Retry this review to synchronize it." }, { status: 502 })));
  render(<ReviewEditor exchange={exchange} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Needs Improvement" }));
  fireEvent.change(screen.getByRole("textbox", { name: /improved answer/i }), { target: { value: "Corrected" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/retry this review/i);
  expect(screen.getByRole("textbox", { name: /improved answer/i })).toHaveValue("Corrected");
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("keeps the applied correction result visible after a successful review", async () => {
  const refreshed = deferred<Response>();
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json(page("s1")))
    .mockResolvedValueOnce(Response.json({ success: true, pineconeChunkId: "dj-correction-42", correctionStatus: "applied" }))
    .mockImplementationOnce(() => refreshed.promise);
  vi.stubGlobal("fetch", fetcher);
  render(<ReviewTab />);
  fireEvent.click(await screen.findByRole("button", { name: /Question.*1 Q/ }));
  fireEvent.click(screen.getByRole("button", { name: "1.Question" }));
  fireEvent.click(screen.getByRole("button", { name: "Needs Improvement" }));
  fireEvent.change(screen.getByRole("textbox", { name: /improved answer/i }), { target: { value: "Corrected" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  expect(screen.getByRole("status")).toHaveTextContent(/saved and correction applied/i);
  await act(async () => { refreshed.resolve(Response.json(page("s1"))); });
  expect(screen.getByRole("status")).toHaveTextContent(/saved and correction applied/i);
});

it("retains the selected editor and its draft when a same-filter refresh fails", async () => {
  const refreshFailure = deferred<Response>();
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(Response.json(page("s1")))
    .mockImplementationOnce(() => refreshFailure.promise));
  const { rerender } = render(<ReviewTab refreshKey={0} />);
  fireEvent.click(await screen.findByRole("button", { name: /Question.*1 Q/ }));
  fireEvent.click(screen.getByRole("button", { name: "1.Question" }));
  fireEvent.click(screen.getByRole("button", { name: "Needs Improvement" }));
  fireEvent.change(screen.getByRole("textbox", { name: /improved answer/i }), { target: { value: "Unsaved correction" } });
  rerender(<ReviewTab refreshKey={1} />);
  await act(async () => { refreshFailure.resolve(new Response("{}", { status: 500 })); });
  expect(screen.getByRole("alert")).toHaveTextContent(/server/i);
  expect(screen.getByRole("textbox", { name: /improved answer/i })).toHaveValue("Unsaved correction");
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

it("restores the selected review draft after a 401 and sign-in", async () => {
  const fetcher = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
    if (input === "/api/admin/session") return Promise.resolve(Response.json({ authenticated: true }));
    if (input === "/api/admin/exchanges") return Promise.resolve(Response.json(page("s1")));
    if (input === "/api/admin/review") return Promise.resolve(new Response("{}", { status: 401 }));
    throw new Error(`Unexpected request: ${input} ${init?.method}`);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<AdminDashboardPage />);
  fireEvent.click(await screen.findByRole("button", { name: /Question.*1 Q/ }));
  fireEvent.click(screen.getByRole("button", { name: "1.Question" }));
  fireEvent.click(screen.getByRole("button", { name: "Needs Improvement" }));
  fireEvent.change(screen.getByRole("textbox", { name: /improved answer/i }), { target: { value: "Restore my answer" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  await screen.findByRole("button", { name: /sign in/i });
  expect(screen.queryByRole("button", { name: "Submit Review" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("textbox", { name: /improved answer/i })).toHaveValue("Restore my answer");
  expect(screen.getByRole("button", { name: "Submit Review" })).toBeInTheDocument();
});

it("restores an unsaved settings label and selected tab after a 401 and sign-in", async () => {
  const settings = { mode: "default", visiblePersonas: ["vc"], personaLabels: { vc: { en: "VC", kr: "VC" } } };
  let settingsCalls = 0;
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string) => {
    if (input === "/api/admin/session") return Promise.resolve(Response.json({ authenticated: true }));
    if (input === "/api/admin/exchanges") return Promise.resolve(Response.json(page("s1")));
    if (input === "/api/admin/settings") return Promise.resolve(++settingsCalls === 2 ? new Response("{}", { status: 401 }) : Response.json(settings));
    throw new Error(`Unexpected request: ${input}`);
  }));
  render(<AdminDashboardPage />);
  fireEvent.click(await screen.findByRole("tab", { name: "Settings" }));
  const label = await screen.findByRole("textbox", { name: /vc english label/i });
  fireEvent.change(label, { target: { value: "My custom VC" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  await screen.findByRole("button", { name: /sign in/i });
  expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("textbox", { name: /vc english label/i })).toHaveValue("My custom VC");
  expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
});

it("shows administrator guidance without automatic retry for an uncertain correction", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: false, pineconeChunkId: null, correctionStatus: "failed", correctionError: "Review saved, but synchronization could not be confirmed. An administrator must verify provider activity has ended before releasing this review claim." }, { status: 502 }));
  vi.stubGlobal("fetch", fetcher);
  render(<ReviewEditor exchange={exchange} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Good" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/administrator must verify/i);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("does not close or claim saved when a review receives 401", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  const onSaved = vi.fn();
  render(<ReviewEditor exchange={exchange} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Good" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Review comment" }), { target: { value: "Keep draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  expect(screen.getByRole("textbox", { name: "Review comment" })).toHaveValue("Keep draft");
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("rejects a malformed successful review reply without closing the draft", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true })));
  const onSaved = vi.fn();
  render(<ReviewEditor exchange={exchange} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Good" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/invalid server response/i);
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("rejects invalid JSON from a review save without claiming success", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{", { status: 200, headers: { "Content-Type": "application/json" } })));
  render(<ReviewEditor exchange={exchange} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Needs Improvement" }));
  fireEvent.change(screen.getByRole("textbox", { name: /improved answer/i }), { target: { value: "Preserve this" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/invalid server response/i);
  expect(screen.getByRole("textbox", { name: /improved answer/i })).toHaveValue("Preserve this");
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("shows the server's concurrent review guidance for 409", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "review_in_progress", error: "A review for this exchange is already in progress" }, { status: 409 })));
  render(<ReviewEditor exchange={exchange} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Good" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/already in progress/i);
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});

it("keeps edited labels after a failed settings save", async () => {
  const settings = { mode: "default", visiblePersonas: ["vc"], personaLabels: { vc: { en: "VC", kr: "VC" } } };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(settings)).mockResolvedValueOnce(new Response("{}", { status: 500 })));
  render(<SettingsTab />);
  const label = await screen.findByRole("textbox", { name: /vc english label/i });
  fireEvent.change(label, { target: { value: "Investor" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/server/i);
  expect(label).toHaveValue("Investor");
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
});
