export type Language = "en" | "kr";

export function toApiLanguage(lang: Language): "en" | "ko" {
  return lang === "kr" ? "ko" : "en";
}
