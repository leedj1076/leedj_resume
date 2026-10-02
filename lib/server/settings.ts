import "server-only";
import {
  appSettingsSchema,
  settingsPatchSchema,
  type AppSettings,
  type SettingsPatch,
} from "../domain/admin";
import { ALL_PERSONAS } from "../persona-config";
import { V14_PERSONA_OPTIONS } from "../profile-data";
import { getSupabaseClient } from "../supabase";
import { HttpError } from "./http";
import { requireDatabase } from "./database";

function defaults(): AppSettings {
  return {
    mode: "default",
    visiblePersonas: [...ALL_PERSONAS],
    personaLabels: Object.fromEntries(
      V14_PERSONA_OPTIONS.map(({ value, en, kr }) => [value, { en, kr }]),
    ),
  };
}

function mergeLabels(
  base: AppSettings["personaLabels"],
  override: unknown,
): AppSettings["personaLabels"] {
  if (!override || typeof override !== "object" || Array.isArray(override))
    return base;
  const result = { ...base };
  for (const key of Object.keys(base)) {
    const value = (override as Record<string, unknown>)[key];
    if (!value || typeof value !== "object") continue;
    const label = value as Record<string, unknown>;
    result[key] = {
      en:
        typeof label.en === "string" && label.en.trim()
          ? label.en.trim()
          : base[key].en,
      kr:
        typeof label.kr === "string" && label.kr.trim()
          ? label.kr.trim()
          : base[key].kr,
    };
  }
  return result;
}

async function readValue(
  key: string,
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
): Promise<string | null> {
  const { data, error } = await client
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error && error.code !== "PGRST116")
    throw new Error(`Settings read failed: ${error.message}`);
  if (data === null) return null;
  if (!data || typeof data.value !== "string")
    throw new Error("Settings row is invalid");
  return data.value;
}

async function loadSettings(strict: boolean): Promise<AppSettings> {
  const result = defaults();
  const client = getSupabaseClient();
  if (!client) {
    if (strict)
      throw new HttpError(
        503,
        "storage_unavailable",
        "Settings are temporarily unavailable",
      );
    return result;
  }
  let mode: string | null;
  let visible: string | null;
  let labels: string | null;
  try {
    [mode, visible, labels] = await Promise.all([
      readValue("answer_mode", client),
      readValue("visible_personas", client),
      readValue("persona_labels", client),
    ]);
  } catch {
    if (strict)
      throw new HttpError(
        503,
        "storage_unavailable",
        "Settings are temporarily unavailable",
      );
    // Public experiences remain usable when optional settings storage is down.
    return result;
  }
  if (mode === "default" || mode === "pyramid") result.mode = mode;
  if (visible) {
    try {
      const value = JSON.parse(visible);
      if (Array.isArray(value)) {
        const valid = value.filter((p) => ALL_PERSONAS.includes(p));
        if (valid.length) result.visiblePersonas = [...new Set(valid)];
      }
    } catch {
      /* Preserve public defaults for a malformed optional setting. */
    }
  }
  if (labels) {
    try {
      result.personaLabels = mergeLabels(
        result.personaLabels,
        JSON.parse(labels),
      );
    } catch {
      /* Preserve public defaults for a malformed optional setting. */
    }
  }
  return appSettingsSchema.parse(result);
}

export async function readSettings(): Promise<AppSettings> {
  return loadSettings(false);
}

export async function saveSettings(patch: SettingsPatch): Promise<AppSettings> {
  const parsed = settingsPatchSchema.safeParse(patch);
  if (!parsed.success)
    throw new HttpError(400, "invalid_settings", "Invalid settings");
  if (Object.keys(parsed.data).length === 0) return readSettings();
  const client = requireDatabase();
  const current = await loadSettings(true);
  const next: AppSettings = {
    mode: parsed.data.mode ?? current.mode,
    visiblePersonas:
      parsed.data.visiblePersonas === undefined
        ? current.visiblePersonas
        : parsed.data.visiblePersonas.length
          ? [...new Set(parsed.data.visiblePersonas)]
          : [...ALL_PERSONAS],
    personaLabels:
      parsed.data.personaLabels === undefined
        ? current.personaLabels
        : mergeLabels(current.personaLabels, parsed.data.personaLabels),
  };
  const rows: { key: string; value: string; updated_at: string }[] = [];
  const updated = new Date().toISOString();
  if (parsed.data.mode !== undefined)
    rows.push({ key: "answer_mode", value: next.mode, updated_at: updated });
  if (parsed.data.visiblePersonas !== undefined) {
    rows.push({
      key: "visible_personas",
      value: JSON.stringify(next.visiblePersonas),
      updated_at: updated,
    });
  }
  if (parsed.data.personaLabels !== undefined) {
    rows.push({
      key: "persona_labels",
      value: JSON.stringify(next.personaLabels),
      updated_at: updated,
    });
  }
  if (rows.length === 0) return current;
  const { error } = await client
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) throw new Error(`Settings write failed: ${error.message}`);
  return appSettingsSchema.parse(next);
}
