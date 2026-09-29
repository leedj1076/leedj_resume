import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";
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
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "invalid_request", "Invalid settings");
    const { mode, visiblePersonas, personaLabels } = body as Record<string, unknown>;

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
  } catch (error) {
    return errorResponse(error);
  }
}
