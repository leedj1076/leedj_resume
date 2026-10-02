import { expect, test } from "@playwright/test";
import { blockUnexpectedRequests } from "./fixtures/chat-stream";

for (const route of ["/admin/dashboard", "/admin/internal", "/admin/capture"]) {
  test(`${route} shows the unauthorized sign-in state`, async ({ page }) => {
    await blockUnexpectedRequests(page);
    await page.route("**/api/admin/session", (request) =>
      request.fulfill({
        status: 401,
        contentType: "application/json",
        body: '{"error":"Unauthorized","code":"unauthorized"}',
      }),
    );
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Admin sign in" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
  });
}

test("public malformed requests fail without provider credentials", async ({
  request,
}) => {
  const invalidJson = await request.post("/api/chat", {
    data: Buffer.from("{"),
    headers: { "Content-Type": "application/json" },
  });
  expect(invalidJson.status()).toBe(400);
  expect((await invalidJson.json()).code).toBe("invalid_json");
  const invalidQuery = await request.post("/api/ui-chat", {
    data: { query: {}, personaId: "general" },
  });
  expect(invalidQuery.status()).toBe(400);
  const internal = await request.post("/api/chat", {
    data: {
      internal: true,
      messages: [{ role: "user", parts: [{ type: "text", text: "Hello" }] }],
    },
  });
  expect(internal.status()).toBe(401);
});
