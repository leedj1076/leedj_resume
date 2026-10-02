import { describe, expect, it } from "vitest";
import { layoutConversation, type PdfMetrics } from "@/lib/chat/export-pdf";
import type { ChatUIMessage } from "@/lib/types";

const metrics: PdfMetrics = {
  pageWidth: 210,
  pageHeight: 297,
  leftMargin: 26,
  rightMargin: 26,
  topMargin: 26,
  bottomMargin: 22,
  firstPageBodyY: 105,
  lineHeight: 5.5,
  messageGap: 12,
  textOffset: 12,
  wrapText: (text) => text.split("\n"),
};

function message(
  role: "user" | "assistant",
  text: string,
  id: string = role,
): ChatUIMessage {
  return { id, role, parts: [{ type: "text", text }] } as ChatUIMessage;
}

function bodyLines(messages: ChatUIMessage[]) {
  return layoutConversation(messages, metrics).pages.flatMap(
    (page) => page.lines,
  );
}

describe("PDF conversation layout", () => {
  it("places every line of a 60-line answer inside page margins without an empty first page", () => {
    const answer = Array.from(
      { length: 60 },
      (_, index) => `Answer ${String(index + 1).padStart(3, "0")}`,
    ).join("\n");
    const pages = layoutConversation(
      [message("user", "Question"), message("assistant", answer)],
      metrics,
    ).pages;
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].lines[0].text).toBe("Question");
    expect(
      pages
        .flatMap((page) => page.lines)
        .filter((line) => line.role === "assistant")
        .map((line) => line.text),
    ).toEqual(answer.split("\n"));
    expect(pages.every((page) => page.lines.length > 0)).toBe(true);
    expect(
      pages
        .flatMap((page) => page.lines)
        .every(
          (line) =>
            line.y >= metrics.topMargin &&
            line.y <= metrics.pageHeight - metrics.bottomMargin,
        ),
    ).toBe(true);
  });

  it("preserves all 200 body lines and page-local accents within A4 margins", () => {
    const answer = Array.from(
      { length: 200 },
      (_, index) => `Line ${String(index + 1).padStart(3, "0")}`,
    ).join("\n");
    const pages = layoutConversation(
      [message("assistant", answer)],
      metrics,
    ).pages;
    const bodyLines = pages.flatMap((page) => page.lines);
    expect(bodyLines).toHaveLength(200);
    expect(bodyLines.map((line) => line.text)).toEqual(answer.split("\n"));
    expect(
      bodyLines.every(
        (line) =>
          line.y >= metrics.topMargin &&
          line.y <= metrics.pageHeight - metrics.bottomMargin,
      ),
    ).toBe(true);
    expect(
      pages
        .slice(1)
        .every(
          (page) => page.lines[0].y >= metrics.topMargin + metrics.lineHeight,
        ),
    ).toBe(true);
    expect(
      pages.every(
        (page) =>
          page.lines.length > 0 &&
          page.accents.every(
            (accent) =>
              accent.yStart >= metrics.topMargin - 3 &&
              accent.yEnd <= metrics.pageHeight - metrics.bottomMargin,
          ),
      ),
    ).toBe(true);
  });

  it("keeps mixed Korean and English in order across message boundaries", () => {
    const lines = bodyLines([
      message("user", "한국어 질문 English question", "q"),
      message("assistant", "한국어 답변\nEnglish answer", "a"),
    ]);
    expect(lines.map((line) => [line.role, line.text])).toEqual([
      ["user", "한국어 질문 English question"],
      ["assistant", "한국어 답변"],
      ["assistant", "English answer"],
    ]);
    expect(lines[1].y).toBeGreaterThan(lines[0].y);
  });

  it("returns a header-only page for an empty conversation", () => {
    const pages = layoutConversation([], metrics).pages;
    expect(pages).toHaveLength(1);
    expect(pages[0].lines).toEqual([]);
  });

  it("removes follow-up metadata while keeping the answer", () => {
    const lines = bodyLines([
      message(
        "assistant",
        "A **clear** answer.\n<followup>\nCould you tell me more?\n</followup>",
      ),
    ]);
    expect(lines.map((line) => line.text)).toEqual(["A clear answer."]);
  });
});
