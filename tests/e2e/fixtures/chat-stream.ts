import type { Page } from "@playwright/test";

export async function blockUnexpectedRequests(page: Page) {
  await page.route("**/api/**", (route) => {
    throw new Error(
      `Unexpected API request: ${route.request().method()} ${route.request().url()}`,
    );
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3100\/)/, (route) =>
    route.abort(),
  );
}

export async function mockChatStream(
  page: Page,
  answer: string,
  requests: unknown[],
) {
  await page.route("**/api/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    const body =
      [
        'data: {"type":"start","messageId":"fixture-answer"}',
        'data: {"type":"text-start","id":"fixture-text"}',
        `data: ${JSON.stringify({ type: "text-delta", id: "fixture-text", delta: answer })}`,
        'data: {"type":"text-end","id":"fixture-text"}',
        'data: {"type":"finish"}',
      ].join("\n\n") + "\n\n";
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body,
    });
  });
}
