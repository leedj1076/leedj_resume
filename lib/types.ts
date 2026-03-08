import type { UIMessage } from "ai";

export type Persona =
  | "recruiter"
  | "founder"
  | "partner"
  | "curious_visitor";

export type Focus =
  | "business_development"
  | "ai_llms"
  | "leadership_strategy"
  | "full_stack";

export interface VisitorData {
  persona: Persona;
  focus: Focus;
}

export type MessageMetadata = {
  sourceTags?: string[];
};

export type ChatUIMessage = UIMessage<MessageMetadata>;
