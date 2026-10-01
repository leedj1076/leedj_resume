import type { ModelMessage } from "ai";
import type { PrototypeRequest } from "./chat-request";
import { CORE_STRENGTH_IDS, FOCUS_HIGHLIGHT, FOCUS_SKILL_TERMS, PERSONA_TONE } from "../persona-config";
import { ANSWER_MODE_PROMPTS } from "../answer-modes";
import { selectEvidence } from "../rag/selection";
import { assembleContext } from "../rag/context";
import { embedQuery, fetchChunks, generateAnswer, readAnswerMode, searchChunks } from "./providers";

export async function handlePrototypeChat(request: PrototypeRequest, signal: AbortSignal): Promise<{ response: string; chunksUsed: string[] }> {
  signal.throwIfAborted();
  const vector = await embedQuery(request.query, signal);
  signal.throwIfAborted();
  const focusTerms = FOCUS_SKILL_TERMS[request.focus];
  const semantic = await searchChunks({ vector, topK: 10 }, signal);
  signal.throwIfAborted();
  const pinned = await fetchChunks(["narrative-career-trajectory", "personal-summary", ...CORE_STRENGTH_IDS], signal);
  signal.throwIfAborted();
  const focused = request.focus !== "full_stack" && focusTerms.length
    ? await searchChunks({ vector, topK: 8, filter: { skills: { $in: focusTerms } } }, signal) : [];
  signal.throwIfAborted();
  const byId = new Map<string, (typeof pinned)[number]>();
  for (const chunk of [...pinned, ...semantic, ...focused]) {
    if (!byId.has(chunk.id)) byId.set(chunk.id, chunk);
  }
  const chunks = [...byId.values()];
  const selection = selectEvidence(chunks, [], { persona: request.persona, focus: request.focus }, "specific");
  const context = assembleContext(selection);
  const answerMode = await readAnswerMode();
  signal.throwIfAborted();
  const messages: ModelMessage[] = request.messages.slice(-10).map(message => ({ role: message.role, content: message.parts.map(part => part.text).join("") }));
  const response = await generateAnswer({ maxOutputTokens: 2048, signal, messages, system:
    `You are the professional whose resume is provided below. Answer questions as if you are speaking about yourself in first person ("I", "my", "me").
Stay grounded in the facts from your resume.

${ANSWER_MODE_PROMPTS[answerMode]}

LANGUAGE: Detect the language of each user message and respond in the SAME language.

STRICT ACCURACY:
- ONLY answer using information explicitly present in the resume context below.
- NEVER invent, infer, or extrapolate details not in the context.
- If a question asks about something not covered, clearly say so.

PRIVACY:
- Never share phone number, home address, or exact salary.
- Email and LinkedIn are OK to share.

${PERSONA_TONE[request.persona]}

${FOCUS_HIGHLIGHT[request.focus]}

--- MY RESUME ---
${context.text}` });
  signal.throwIfAborted();
  return { response, chunksUsed: context.usedChunks.map(chunk => chunk.id) };
}
