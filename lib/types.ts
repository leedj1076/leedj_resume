import type { UIMessage } from "ai";

export type Persona =
  | "vc_investor"
  | "corporate_strategy"
  | "bd_partnerships"
  | "hiring_manager";

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
