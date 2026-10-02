import { expect, it, vi } from "vitest";
import { PROTOTYPES, findPrototype } from "@/lib/prototypes";

const readFile = vi.hoisted(() => vi.fn());
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return { ...actual, readFile, default: { ...actual, readFile } };
});

const assets = [
  ["v2-full-suite", "ask-dj-v4.html"],
  ["v3-narrative", "ask-dj-narrative.html"],
  ["v4-signal-deck", "ask-dj-signal.html"],
  ["v5-merged", "ask-dj-merged-v2.html"],
  ["v6-dd-room", "ask-dj-dd-room.html"],
  ["v7-terminal", "ask-dj-terminal.html"],
  ["v8-memo", "ask-dj-memo.html"],
  ["v9-ic-dashboard", "ask-dj-ic-dashboard.html"],
  ["v10-altos-memo-hub", "altos-memo-hub.html"],
  ["v11-altos-final", "ask-dj-altos-final.html"],
  ["v12-auditable", "ask-dj-v12-auditable.html"],
  ["v13-auditable-plus", "ask-dj-v13-auditable.html"],
  ["v14-profile", "ask-dj-v14-profile.html"],
] as const;

it("catalogs every existing HTML prototype with its gallery metadata", () => {
  expect(PROTOTYPES.map(({ slug, filename }) => [slug, filename])).toEqual(
    assets,
  );
  for (const [slug, filename] of assets) {
    expect(findPrototype(slug)).toMatchObject({ slug, filename });
    expect(findPrototype(slug)?.title).toBeTruthy();
    expect(findPrototype(slug)?.description).toBeTruthy();
  }
});

it.each([
  "constructor",
  "toString",
  "__proto__",
  "../README.md",
  "unknown",
  "v1-original",
])("rejects unlisted prototype name %s", (name) =>
  expect(findPrototype(name)).toBeUndefined(),
);

it("returns 404 for unlisted names before reading the filesystem", async () => {
  const { GET } = await import("@/app/ui/[name]/route");
  for (const name of [
    "constructor",
    "toString",
    "__proto__",
    "../README.md",
    "unknown",
  ]) {
    readFile.mockClear();
    const response = await GET(new Request("http://localhost/ui/test"), {
      params: Promise.resolve({ name }),
    });
    expect(response.status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  }
});

it("serves a cataloged HTML prototype unchanged", async () => {
  readFile.mockResolvedValueOnce("<!doctype html><title>Prototype</title>");
  const { GET } = await import("@/app/ui/[name]/route");
  const response = await GET(new Request("http://localhost/ui/v2-full-suite"), {
    params: Promise.resolve({ name: "v2-full-suite" }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  expect(await response.text()).toBe("<!doctype html><title>Prototype</title>");
  expect(readFile.mock.calls[0][0]).toMatch(/ui_test\/ask-dj-v4\.html$/);
});
