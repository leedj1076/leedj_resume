import type { AnswerMode } from "./answer-modes";
import type { Persona } from "./types";
import { ALL_PERSONAS } from "./persona-config";
import { readSettings, saveSettings } from "./server/settings";

export interface PersonaLabel { en: string; kr: string }
export type PersonaLabels = Record<string, PersonaLabel>;

export async function getAnswerMode(): Promise<AnswerMode> {
  return (await readSettings()).mode;
}

export async function setAnswerMode(mode: AnswerMode): Promise<void> {
  await saveSettings({ mode });
}

export async function getVisiblePersonas(): Promise<Persona[]> {
  return (await readSettings()).visiblePersonas;
}

export async function setVisiblePersonas(personas: Persona[]): Promise<Persona[]> {
  const valid = personas.filter((persona) => ALL_PERSONAS.includes(persona));
  return (await saveSettings({ visiblePersonas: valid })).visiblePersonas;
}

export async function getPersonaLabels(): Promise<PersonaLabels> {
  return (await readSettings()).personaLabels;
}

export async function setPersonaLabels(labels: PersonaLabels): Promise<PersonaLabels> {
  return (await saveSettings({ personaLabels: labels })).personaLabels;
}
