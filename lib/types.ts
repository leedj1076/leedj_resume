import type { UIMessage } from "ai";

export type Persona =
  | "recruiter"
  | "vc"
  | "founder_partner"
  | "curious_visitor"
  | "developer_partnerships";

export type Focus =
  | "business_development"
  | "ai_llms"
  | "leadership_strategy"
  | "full_stack";

export interface VisitorData {
  persona: Persona;
  focus: Focus;
}

export interface TraceStep {
  label: string;
  timestamp: number; // ms since request start
  summary: string;   // one-line human-readable summary
  data: Record<string, unknown>;
}

export interface TraceData {
  steps: TraceStep[];
  totalDurationMs: number;
}

export type MessageMetadata = {
  sourceTags?: string[];
  trace?: TraceData;
};

export type ChatUIMessage = UIMessage<MessageMetadata>;
