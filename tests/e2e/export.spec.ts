import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000" });

for (const fixture of [
  { lang: "en", question: "Synthetic English question", answer: "Synthetic English answer", exportLabel: "Export", inputLabel: "Ask a question", sendLabel: "Send" },
  { lang: "kr", question: "합성 한국어 질문", answer: "합성 한국어 답변", exportLabel: "내보내기", inputLabel: "질문 입력", sendLabel: "전송" },
] as const) {
  test(`downloads a readable ${fixture.lang} conversation PDF`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("v14-welcomed", "1"));
    await page.route("**/api/chat", async (route) => {
      const body = [
        'data: {"type":"start","messageId":"synthetic-answer"}',
        'data: {"type":"text-start","id":"synthetic-text"}',
        `data: ${JSON.stringify({ type: "text-delta", id: "synthetic-text", delta: fixture.answer })}`,
        'data: {"type":"text-end","id":"synthetic-text"}',
        'data: {"type":"finish"}',
      ].join("\n\n") + "\n\n";
      await route.fulfill({ status: 200, contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" }, body });
    });
    await page.goto("/dj");
    if (fixture.lang === "kr") await page.getByRole("button", { name: "Switch to Korean" }).click();
    const exportButton = page.getByRole("button", { name: fixture.exportLabel, exact: true });
    await expect(exportButton).toBeDisabled();
    await page.getByRole("textbox", { name: fixture.inputLabel }).fill(fixture.question);
    await page.getByRole("button", { name: fixture.sendLabel, exact: true }).click();
    await expect(page.getByRole("log")).toContainText(fixture.answer);
    await expect(exportButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^dj-lee-chat-\d{4}-\d{2}-\d{2}\.pdf$/);
    const bytes = await readFile(await download.path());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(10_000);
  });
}
