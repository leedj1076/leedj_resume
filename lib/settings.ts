import { supabase } from "./supabase";
import type { AnswerMode } from "./answer-modes";
import type { Persona } from "./types";
import { ALL_PERSONAS } from "./persona-config";
import { V14_PERSONA_OPTIONS } from "./profile-data";

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

// Which personas are selectable on the public profile. Read fresh every call
// (no cache) so an admin toggle propagates without a cold start. Stored as a
// JSON string array under the "visible_personas" key. Missing/empty/invalid
// falls back to all personas — the profile must never end up with zero options.
export async function getVisiblePersonas(): Promise<Persona[]> {
  try {
    if (supabase) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "visible_personas")
        .single();

      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((p): p is Persona =>
            (ALL_PERSONAS as string[]).includes(p)
          );
          if (valid.length > 0) return valid;
        }
      }
    }
  } catch {
    // Table missing or bad JSON — fall back to all visible
  }
  return [...ALL_PERSONAS];
}

export async function setVisiblePersonas(personas: Persona[]): Promise<Persona[]> {
  const valid = personas.filter((p) => (ALL_PERSONAS as string[]).includes(p));
  // Guard: never persist an empty set, which would hide every persona.
  const toStore = valid.length > 0 ? valid : [...ALL_PERSONAS];

  if (supabase) {
    await supabase.from("app_settings").upsert({
      key: "visible_personas",
      value: JSON.stringify(toStore),
      updated_at: new Date().toISOString(),
    });
  }
  return toStore;
}

// Editable display names for the persona buttons. Stored as a JSON map
// value -> { en, kr } under "persona_labels", merged over the static defaults
// in V14_PERSONA_OPTIONS. A blank/missing label falls back to its default so a
// button is never nameless. Read fresh (no cache) like visibility.
export interface PersonaLabel {
  en: string;
  kr: string;
}
export type PersonaLabels = Record<string, PersonaLabel>;

function defaultPersonaLabels(): PersonaLabels {
  const out: PersonaLabels = {};
  for (const o of V14_PERSONA_OPTIONS) out[o.value] = { en: o.en, kr: o.kr };
  return out;
}

function mergeLabels(overrides: unknown): PersonaLabels {
  const result = defaultPersonaLabels();
  if (overrides && typeof overrides === "object") {
    const map = overrides as Record<string, { en?: unknown; kr?: unknown }>;
    for (const key of Object.keys(result)) {
      const ov = map[key];
      if (ov && typeof ov === "object") {
        const en =
          typeof ov.en === "string" && ov.en.trim() ? ov.en.trim() : result[key].en;
        const kr =
          typeof ov.kr === "string" && ov.kr.trim() ? ov.kr.trim() : result[key].kr;
        result[key] = { en, kr };
      }
    }
  }
  return result;
}

export async function getPersonaLabels(): Promise<PersonaLabels> {
  try {
    if (supabase) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "persona_labels")
        .single();
      if (data?.value) return mergeLabels(JSON.parse(data.value));
    }
  } catch {
    // Table missing or bad JSON — fall back to defaults
  }
  return defaultPersonaLabels();
}

export async function setPersonaLabels(
  labels: PersonaLabels
): Promise<PersonaLabels> {
  const merged = mergeLabels(labels);
  if (supabase) {
    await supabase.from("app_settings").upsert({
      key: "persona_labels",
      value: JSON.stringify(merged),
      updated_at: new Date().toISOString(),
    });
  }
  return merged;
}
