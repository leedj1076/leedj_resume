import { beforeEach, describe, expect, it, vi } from "vitest";

const alert = vi.hoisted(() => ({
  sends: [] as Record<string, unknown>[],
  pending: [] as Promise<unknown>[],
  reject: false,
  inserts: [] as Record<string, unknown>[],
  rejectInsert: false,
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: (promise: Promise<unknown>) => {
    alert.pending.push(promise);
  },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (payload: Record<string, unknown>) => {
        alert.sends.push(payload);
        if (alert.reject) throw new Error("provider rejected");
        return { data: { id: "sent" }, error: null };
      },
    };
  },
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from() {
      return {
        insert: async (row: Record<string, unknown>) => {
          alert.inserts.push(row);
          if (alert.rejectInsert) throw new Error("insert rejected");
          return { data: null, error: null };
        },
      };
    },
  }),
}));

const details = {
  query: "<script>alert('x')</script>",
  persona: "vc",
  focus: "general",
  lang: "en",
  sessionId: "session-1",
  visitorEmail: "person@example.com",
};

describe("session alerts", () => {
  beforeEach(() => {
    vi.resetModules();
    alert.sends = [];
    alert.pending = [];
    alert.reject = false;
    process.env.RESEND_API_KEY = "offline-test-key";
    process.env.RESEND_FROM = "Ask DJ <sender@example.com>";
    process.env.RESEND_TO = "owner@example.com";
  });

  it("sends hostile HTML literally as plain text", async () => {
    const { sendNewSessionAlert } = await import("@/lib/email");
    sendNewSessionAlert(details);
    await Promise.all(alert.pending);
    expect(alert.sends).toHaveLength(1);
    expect(alert.sends[0]).toMatchObject({
      text: expect.stringContaining(details.query),
    });
    expect(alert.sends[0]).not.toHaveProperty("html");
  });

  it("excludes internal sessions", async () => {
    const { sendNewSessionAlert } = await import("@/lib/email");
    sendNewSessionAlert({ ...details, internal: true });
    expect(alert.sends).toHaveLength(0);
  });

  it("disables incomplete configuration without disrupting the caller", async () => {
    delete process.env.RESEND_TO;
    const diagnostic = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendNewSessionAlert } = await import("@/lib/email");
    expect(() => sendNewSessionAlert(details)).not.toThrow();
    expect(alert.sends).toHaveLength(0);
    expect(diagnostic).toHaveBeenCalled();
    diagnostic.mockRestore();
  });

  it("isolates provider rejection from the chat lifecycle", async () => {
    alert.reject = true;
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendNewSessionAlert } = await import("@/lib/email");
    expect(() => sendNewSessionAlert(details)).not.toThrow();
    await expect(Promise.all(alert.pending)).resolves.toBeDefined();
    expect(diagnostic).toHaveBeenCalled();
    diagnostic.mockRestore();
  });
});

describe("analytics delivery", () => {
  beforeEach(() => {
    vi.resetModules();
    alert.pending = [];
    alert.inserts = [];
    alert.rejectInsert = false;
  });

  it("keeps waitUntil while avoiding sensitive console payloads", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logAnalytics } = await import("@/lib/analytics");
    logAnalytics({
      type: "query",
      query: "private user question",
      sessionId: "session-1",
    });
    await Promise.all(alert.pending);
    expect(alert.inserts).toMatchObject([
      { query: "private user question", session_id: "session-1" },
    ]);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("isolates insert rejection", async () => {
    alert.rejectInsert = true;
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logExchange } = await import("@/lib/analytics");
    expect(() =>
      logExchange({
        sessionId: "s",
        persona: "vc",
        focus: "general",
        lang: "en",
        query: "private",
        response: "answer",
        chunksUsed: [],
      }),
    ).not.toThrow();
    await expect(Promise.all(alert.pending)).resolves.toBeDefined();
    expect(diagnostic).toHaveBeenCalled();
    diagnostic.mockRestore();
  });
});
