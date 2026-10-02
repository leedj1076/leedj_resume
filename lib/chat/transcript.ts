import { z } from "zod";

const TurnSchema = z.object({
  speaker: z.enum(["interviewer", "subject"]),
  text: z.string(),
});
const TranscriptSchema = z.object({ version: z.literal(1), turns: z.array(TurnSchema) });

export type Transcript = z.infer<typeof TranscriptSchema>;
export type InterviewExchange = { question: string; answer: string };
export type TranscriptFormat = "auto" | "capture-legacy" | "qa";

const explicitLabels = { interviewer: "Interviewer", subject: "Subject" } as const;

export function serializeTranscript(transcript: Transcript, format: "json" | "text"): string {
  const valid = TranscriptSchema.parse(transcript);
  if (format === "json") return JSON.stringify(valid, null, 2);
  return ["Transcript v1", ...valid.turns.map(({ speaker, text }) => {
    const escaped = text.replace(/^([\\]|(?:Interviewer|Subject):)/gm, "\\$1");
    return `${explicitLabels[speaker]}:\n${escaped}`;
  })].join("\n\n");
}

function parseJson(raw: string, format: TranscriptFormat): Transcript {
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error("Invalid transcript JSON"); }
  if (Array.isArray(value)) {
    if (format === "qa") throw new Error("Capture JSON cannot be parsed as Q/A text");
    const turns: Transcript["turns"] = value.map((item, index) => {
      if (!item || typeof item !== "object") throw new Error(`Invalid capture message ${index + 1}`);
      const message = item as Record<string, unknown>;
      const speaker: "interviewer" | "subject" | null = message.role === "assistant" ? "interviewer" : message.role === "user" ? "subject" : null;
      if (!speaker || typeof message.content !== "string") throw new Error(`Invalid capture message ${index + 1}: expected assistant/user role and text content`);
      return { speaker, text: message.content };
    });
    return { version: 1, turns };
  }
  const parsed = TranscriptSchema.safeParse(value);
  if (!parsed.success) throw new Error("Invalid transcript JSON: expected version 1 with interviewer/subject turns");
  return parsed.data;
}

function parseLabelledText(raw: string, labels: Record<string, "interviewer" | "subject">, header?: string): Transcript {
  const normalized = raw.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (header) {
    if (lines.shift()?.trim() !== header) throw new Error(`Expected ${header} header`);
    while (lines[0] === "") lines.shift();
  }
  const turns: Transcript["turns"] = [];
  let speaker: "interviewer" | "subject" | null = null;
  let content: string[] = [];
  const flush = () => {
    if (speaker) turns.push({ speaker, text: header ? content.join("\n") : content.join("\n").trim() });
    content = [];
  };
  for (const line of lines) {
    const match = /^([A-Za-z]+):(?:[ \t]*(.*))?$/.exec(line);
    const nextSpeaker = match ? labels[match[1].toLowerCase()] : undefined;
    if (nextSpeaker) {
      if (header && speaker && content.at(-1) === "") content.pop();
      flush();
      speaker = nextSpeaker;
      if (match?.[2]) content.push(match[2]);
      continue;
    }
    if (!speaker) {
      if (line.trim()) throw new Error("Unknown transcript format: expected labelled turns");
      continue;
    }
    content.push(header && /^\\(?:\\|(?:Interviewer|Subject):)/.test(line) ? line.slice(1) : line);
  }
  flush();
  if (!turns.length) throw new Error("Unknown transcript format: no labelled turns found");
  if (turns.some((turn) => !turn.text)) throw new Error("Transcript contains an empty turn");
  return { version: 1, turns };
}

export function parseTranscript(raw: string, format: TranscriptFormat = "auto"): Transcript {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Transcript is empty");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return parseJson(trimmed, format);
  if (format === "capture-legacy") return parseLabelledText(trimmed, { assistant: "interviewer", human: "subject", user: "subject" });
  if (format === "qa") return parseLabelledText(trimmed, { q: "interviewer", a: "subject" });
  if (/^Transcript v1(?:\r?\n|$)/.test(trimmed)) return parseLabelledText(raw, { interviewer: "interviewer", subject: "subject" }, "Transcript v1");
  if (/^(?:Human|User|Assistant):/im.test(trimmed)) throw new Error("Ambiguous Human/Assistant transcript; use --format capture-legacy to assign roles");
  if (/^(?:Q|A):/im.test(trimmed)) return parseLabelledText(trimmed, { q: "interviewer", a: "subject" });
  throw new Error("Unknown transcript format. Use versioned capture export, --format capture-legacy, or --format qa");
}

export function toInterviewExchanges(transcript: Transcript): InterviewExchange[] {
  const valid = TranscriptSchema.parse(transcript);
  const exchanges: InterviewExchange[] = [];
  let questions: string[] = [];
  let answers: string[] = [];
  const flush = () => {
    if (questions.length && answers.length) exchanges.push({ question: questions.join("\n\n"), answer: answers.join("\n\n") });
    questions = [];
    answers = [];
  };
  for (const { speaker, text } of valid.turns) {
    const clean = text.trim();
    if (!clean) continue;
    if (speaker === "interviewer") {
      if (answers.length) flush();
      questions.push(clean);
    } else if (questions.length) {
      answers.push(clean);
    }
  }
  flush();
  return exchanges;
}
