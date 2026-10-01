import type { UIMessage } from "ai";

export type { Persona, Focus, VisitorData, PersonaLabel, PersonaOption } from "./domain/personas";

export type { TraceStep, TraceData } from "./rag/trace";
import type { TraceData } from "./rag/trace";

export type MessageMetadata = {
  sourceTags?: string[];
  trace?: TraceData;
};

export type ChatUIMessage = UIMessage<MessageMetadata>;
