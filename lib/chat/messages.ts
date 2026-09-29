import type { ChatUIMessage } from "../types";

export function getMessageText(message: ChatUIMessage): string {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

export function parseFollowUps(text: string): { clean: string; followUps: string[] } {
  const match = text.match(/<followup>\n?([\s\S]*?)<\/followup>\s*$/);
  if (!match) return { clean: text, followUps: [] };
  return {
    clean: text.replace(match[0], "").trimEnd(),
    followUps: match[1].trim().split("\n").filter(Boolean).slice(0, 2),
  };
}
