import { supabase } from "./supabase";
import type { AnswerMode } from "./answer-modes";

let cachedMode: AnswerMode = "default";
let cacheLoaded = false;

export async function getAnswerMode(): Promise<AnswerMode> {
  if (cacheLoaded) return cachedMode;

  try {
    if (supabase) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "answer_mode")
        .single();

      if (
        data?.value &&
        (data.value === "default" || data.value === "pyramid")
      ) {
        cachedMode = data.value as AnswerMode;
      }
    }
  } catch {
    // Table might not exist yet — fall back to default
  }

  cacheLoaded = true;
  return cachedMode;
}

export async function setAnswerMode(mode: AnswerMode): Promise<void> {
  cachedMode = mode;
  cacheLoaded = true;

  if (supabase) {
    await supabase
      .from("app_settings")
      .upsert({
        key: "answer_mode",
        value: mode,
        updated_at: new Date().toISOString(),
      });
  }
}
