import { getAnswerMode, setAnswerMode } from "@/lib/settings";
import type { AnswerMode } from "@/lib/answer-modes";

export async function POST(req: Request) {
  const { password, mode } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (mode !== undefined) {
    if (mode !== "default" && mode !== "pyramid") {
      return Response.json({ error: "Invalid mode" }, { status: 400 });
    }
    await setAnswerMode(mode as AnswerMode);
  }

  const currentMode = await getAnswerMode();
  return Response.json({ mode: currentMode });
}
