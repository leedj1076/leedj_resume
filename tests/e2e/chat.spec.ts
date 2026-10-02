import { expect, test } from "@playwright/test";
import { blockUnexpectedRequests, mockChatStream } from "./fixtures/chat-stream";

for (const fixture of [
  { lang: "en", answer: "Synthetic English answer", input: "Ask a question", send: "Send", question: "What did DJ build?", languageButton: null, persona: "recruiter" },
  { lang: "ko", answer: "합성 한국어 답변", input: "질문 입력", send: "전송", question: "무엇을 만들었나요?", languageButton: "Switch to Korean", persona: "recruiter" },
] as const) {
  test(`streams and resets a ${fixture.lang} chat with selected persona`, async ({ page }) => {
    const requests: unknown[] = [];
    await blockUnexpectedRequests(page);
    await mockChatStream(page, fixture.answer, requests);
    await page.addInitScript(() => sessionStorage.setItem("v14-welcomed", "1"));
    await page.goto("/dj");
    if (fixture.languageButton) await page.getByRole("button", { name: fixture.languageButton }).click();
    await page.getByRole("group", { name: fixture.lang === "ko" ? "방문자 유형" : "Visitor type" })
      .getByRole("button", { name: fixture.lang === "ko" ? /채용 담당자/ : /Recruiter/ }).first().click();
    const composer = page.getByRole("textbox", { name: fixture.input });
    await composer.fill(fixture.question);
    await composer.press("Enter");
    await expect(page.getByRole("log")).toContainText(fixture.answer);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ visitorData: { persona: fixture.persona }, lang: fixture.lang === "ko" ? "ko" : "en" });
    await page.getByRole("button", { name: fixture.lang === "ko" ? "초기화" : "Reset", exact: true }).click();
    await expect(page.getByRole("log")).not.toContainText(fixture.answer);
  });
}
