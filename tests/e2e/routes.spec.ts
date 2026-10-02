import { expect, test } from "@playwright/test";
import { PROTOTYPES } from "../../lib/prototypes";
import { blockUnexpectedRequests } from "./fixtures/chat-stream";

test("root redirects to the public profile", async ({ page }) => {
  await blockUnexpectedRequests(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/dj$/);
  await expect(page.getByRole("dialog")).toBeVisible();
});

for (const route of [
  "/dj",
  "/dj/apple-immersive-video",
  "/dj/b2b-saas-km-analysis",
  "/dj/breakout-game-analysis",
  "/dj/flint-analysis",
  "/v1",
  "/ui",
]) {
  test(`${route} remains available`, async ({ page }) => {
    await blockUnexpectedRequests(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  });
}

for (const prototype of PROTOTYPES) {
  test(`/ui/${prototype.slug} serves its historical prototype`, async ({
    request,
  }) => {
    const response = await request.get(`/ui/${prototype.slug}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect((await response.text()).length).toBeGreaterThan(100);
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
]) {
  test(`welcome Start stays reachable at ${viewport.width}×${viewport.height} with long labels and enlarged text`, async ({
    page,
  }) => {
    await blockUnexpectedRequests(page);
    await page.setViewportSize(viewport);
    await page.goto("/dj");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("group", { name: "Visitor type" })
      .getByRole("button")
      .first()
      .evaluate((button) => {
        button.textContent =
          "Recruiting and talent acquisition leader with a very long visitor label";
      });
    await dialog.locator("button, p, h2").evaluateAll((elements) => {
      for (const element of elements)
        (element as HTMLElement).style.fontSize = "21px";
    });
    const choice = dialog
      .getByRole("group", { name: "Visitor type" })
      .getByRole("button")
      .first();
    await choice.focus();
    await page.keyboard.press("Enter");
    const start = dialog.getByRole("button", { name: "Start" });
    await expect(start).toBeEnabled();
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeInViewport();
    await start.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
  });
}
