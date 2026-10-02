import type { Language } from "../domain/language";
import type { ChatUIMessage } from "../types";
import { getMessageText, parseFollowUps } from "./messages";

export interface PdfMetrics {
  pageWidth: number;
  pageHeight: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  firstPageBodyY: number;
  lineHeight: number;
  messageGap: number;
  textOffset: number;
  wrapText: (text: string, width: number, role: "user" | "assistant") => string[];
}

export interface PdfLine {
  text: string;
  x: number;
  y: number;
  role: "user" | "assistant";
  messageId: string;
  startsSegment: boolean;
}

export interface PdfAccent {
  role: "user" | "assistant";
  yStart: number;
  yEnd: number;
}

export interface PdfPage {
  lines: PdfLine[];
  accents: PdfAccent[];
}

export interface PdfLayout { pages: PdfPage[] }

/** Compute each body baseline before drawing so wrapping and page breaks share one cursor. */
export function layoutConversation(messages: readonly ChatUIMessage[], metrics: PdfMetrics): PdfLayout {
  const pages: PdfPage[] = [{ lines: [], accents: [] }];
  const textX = metrics.leftMargin + metrics.textOffset;
  const textWidth = metrics.pageWidth - metrics.rightMargin - textX;
  const lastBaseline = metrics.pageHeight - metrics.bottomMargin - 1;
  let y = metrics.firstPageBodyY;

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const raw = getMessageText(message);
    const clean = message.role === "assistant" ? parseFollowUps(raw).clean : raw;
    const text = clean.replace(/\*\*/g, "").trim();
    if (!text) continue;
    const lines = metrics.wrapText(text, textWidth, message.role);
    if (lines.length === 0) continue;

    let segment: PdfAccent | undefined;
    for (const line of lines) {
      if (y > lastBaseline) {
        pages.push({ lines: [], accents: [] });
        y = metrics.topMargin + metrics.lineHeight;
        segment = undefined;
      }
      const page = pages[pages.length - 1];
      const startsSegment = !segment;
      if (!segment) {
        segment = { role: message.role, yStart: Math.max(metrics.topMargin - 2.5, y - 2.5), yEnd: y };
        page.accents.push(segment);
      }
      page.lines.push({ text: line, x: textX, y, role: message.role, messageId: message.id, startsSegment });
      segment.yEnd = Math.min(metrics.pageHeight - metrics.bottomMargin, y + metrics.lineHeight - 1);
      y += metrics.lineHeight;
    }
    y += metrics.messageGap;
  }

  return { pages };
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  return btoa(binary);
}

/** Export a completed conversation. Callers should disable this action while a stream is active. */
export async function exportConversation(
  messages: readonly ChatUIMessage[],
  options: { lang: Language; date: Date },
): Promise<void> {
  if (messages.length === 0) return;
  const [{ jsPDF }, fontResponse] = await Promise.all([
    import("jspdf"),
    fetch("/fonts/NotoSansKR-Regular.ttf"),
  ]);
  if (!fontResponse.ok) throw new Error("The PDF font could not be loaded.");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontData = toBase64(new Uint8Array(await fontResponse.arrayBuffer()));
  doc.addFileToVFS("NotoSansKR-Regular.ttf", fontData);
  doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
  doc.setFont("NotoSansKR", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const metrics: PdfMetrics = {
    pageWidth,
    pageHeight,
    leftMargin: 26,
    rightMargin: 26,
    topMargin: 26,
    bottomMargin: 22,
    firstPageBodyY: 105,
    lineHeight: 5.5,
    messageGap: 12,
    textOffset: 12,
    wrapText: (text, width, role) => {
      doc.setFontSize(role === "user" ? 10 : 9.5);
      return doc.splitTextToSize(text, width);
    },
  };
  const layout = layoutConversation(messages, metrics);
  const en = options.lang === "en";
  const subtitle = en ? "Interactive Profile" : "인터랙티브 프로필";
  const date = options.date.toLocaleDateString(en ? "en-US" : "ko-KR", {
    year: "numeric", month: en ? "long" : "numeric", day: "numeric", timeZone: "UTC",
  });

  layout.pages.forEach((page, index) => {
    if (index > 0) doc.addPage();
    doc.setFont("NotoSansKR", "normal");
    if (index === 0) {
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      doc.text(en ? "CONVERSATION" : "대화 기록", metrics.leftMargin, 32);
      doc.setFontSize(28);
      doc.text(en ? "DJ Lee" : "이동재", metrics.leftMargin, 50);
      doc.setFontSize(10);
      doc.setTextColor(155, 155, 155);
      doc.text(subtitle, metrics.leftMargin, 62);
      doc.setFontSize(9);
      doc.text(date, metrics.leftMargin, 68);
      doc.setDrawColor(215, 215, 215);
      doc.setLineWidth(0.15);
      doc.line(metrics.leftMargin, 84, pageWidth - metrics.rightMargin, 84);
    }

    for (const accent of page.accents) {
      const isUser = accent.role === "user";
      doc.setDrawColor(isUser ? 60 : 215, isUser ? 60 : 215, isUser ? 60 : 215);
      doc.setLineWidth(0.3);
      doc.line(metrics.leftMargin + 6.5, accent.yStart, metrics.leftMargin + 6.5, accent.yEnd);
    }
    for (const line of page.lines) {
      const isUser = line.role === "user";
      if (line.startsSegment) {
        doc.setFontSize(7);
        doc.setTextColor(isUser ? 30 : 155, isUser ? 30 : 155, isUser ? 30 : 155);
        doc.text(isUser ? "Q" : "A", metrics.leftMargin, line.y + 0.5);
      }
      doc.setFontSize(isUser ? 10 : 9.5);
      doc.setTextColor(isUser ? 35 : 85, isUser ? 35 : 85, isUser ? 35 : 85);
      doc.text(line.text, line.x, line.y);
    }

    doc.setFontSize(7);
    doc.setTextColor(155, 155, 155);
    doc.text("DJ LEE", metrics.leftMargin, pageHeight - 14);
    doc.text(subtitle, metrics.leftMargin + 17, pageHeight - 14);
    doc.text(`${index + 1}`, pageWidth - metrics.rightMargin, pageHeight - 14, { align: "right" });
  });

  doc.save(`dj-lee-chat-${options.date.toISOString().slice(0, 10)}.pdf`);
}
