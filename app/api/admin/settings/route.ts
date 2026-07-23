import {
  getAnswerMode,
  setAnswerMode,
  getVisiblePersonas,
  setVisiblePersonas,
  getPersonaLabels,
  setPersonaLabels,
  type PersonaLabels,
} from "@/lib/settings";
import type { AnswerMode } from "@/lib/answer-modes";
import type { Persona } from "@/lib/types";

export async function POST(req: Request) {
  const { password, mode, visiblePersonas, personaLabels } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (mode !== undefined) {
    if (mode !== "default" && mode !== "pyramid") {
      return Response.json({ error: "Invalid mode" }, { status: 400 });
    }
    await setAnswerMode(mode as AnswerMode);
  }

  if (visiblePersonas !== undefined) {
    if (!Array.isArray(visiblePersonas)) {
      return Response.json({ error: "Invalid visiblePersonas" }, { status: 400 });
    }
    await setVisiblePersonas(visiblePersonas as Persona[]);
  }

  if (personaLabels !== undefined) {
    if (typeof personaLabels !== "object" || personaLabels === null) {
      return Response.json({ error: "Invalid personaLabels" }, { status: 400 });
    }
    await setPersonaLabels(personaLabels as PersonaLabels);
  }

  const currentMode = await getAnswerMode();
  const currentVisiblePersonas = await getVisiblePersonas();
  const currentPersonaLabels = await getPersonaLabels();
  return Response.json({
    mode: currentMode,
    visiblePersonas: currentVisiblePersonas,
    personaLabels: currentPersonaLabels,
  });
}
