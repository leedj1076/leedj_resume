import type { Persona, Focus } from "./types";

// Multiplicative score adjustments per persona per section (for re-ranking)
export const PERSONA_SECTION_WEIGHTS: Record<Persona, Record<string, number>> = {
  recruiter: {
    // PO/PM hiring lens: building, shipping, and leading beats investor framing
    experience: 1.4,
    project: 1.4,
    leadership: 1.3,
    skills: 1.2,
    summary: 1.1,
    narrative: 1.1,
    failure_learning: 1.1,
    education: 1.0,
    awards: 0.9,
    founder_philosophy: 0.8,
    founder_empathy: 0.8,
    career_transition: 0.8,
    motivation: 0.7,
    investment_philosophy: 0.6,
  },
  vc: {
    summary: 1.2,
    experience: 1.2,
    motivation: 1.3,
    skills: 1.2,
    career_transition: 1.2,
    narrative: 1.2,
    founder_philosophy: 1.1,
    failure_learning: 1.1,
    project: 1.1,
    education: 1.0,
    awards: 1.0,
    leadership: 1.0,
  },
  founder_partner: {
    experience: 1.4,
    founder_philosophy: 1.3,
    failure_learning: 1.3,
    project: 1.2,
    motivation: 1.2,
    narrative: 1.2,
    founder_empathy: 1.2,
    summary: 1.1,
    skills: 1.0,
    leadership: 0.9,
    education: 0.8,
    awards: 0.7,
  },
  curious_visitor: {
    summary: 1.0,
    experience: 1.0,
    skills: 1.0,
    education: 1.0,
    project: 1.0,
    awards: 1.0,
    leadership: 1.0,
    narrative: 1.0,
    motivation: 1.0,
  },
};

// --- Persona-specific chunk-level filter (beyond section weights) ---
// Matched against Pinecone chunk metadata at re-rank and direct-match time.
// Most knowledge entries were written for VC interview prep, so the recruiter
// persona dampens investor-framed chunks and boosts product-execution chunks.

const VC_FLAVOR_SECTIONS = new Set([
  "motivation",
  "investment_philosophy",
  "career_transition",
  "founder_philosophy",
  "founder_empathy",
]);

const VC_FLAVOR_SKILLS = new Set([
  "investor judgment",
  "due diligence",
  "founder evaluation",
  "investor relations",
  "founder support",
]);

// Entry ids whose answers are framed around becoming an investor
const VC_FLAVOR_ID_HINTS = ["why-vc", "vc-commitment", "altos", "investor"];

const PM_FLAVOR_SKILLS = new Set([
  "product management",
  "product strategy",
  "product-market fit",
  "stakeholder management",
  "stakeholder alignment",
  "user behavior analysis",
  "user research",
  "zero-to-one building",
  "platform strategy",
  "system design",
  "cross-functional leadership",
  "team building",
  "data-driven decision making",
]);

export interface ChunkSignals {
  id: string;
  section: string;
  skills: string[];
}

export function personaChunkAdjustment(
  persona: Persona,
  chunk: ChunkSignals
): number {
  if (persona !== "recruiter") return 1.0;

  let adjustment = 1.0;
  const skills = chunk.skills.map((s) => s.toLowerCase());

  const vcFlavored =
    VC_FLAVOR_SECTIONS.has(chunk.section) ||
    skills.some((s) => VC_FLAVOR_SKILLS.has(s)) ||
    VC_FLAVOR_ID_HINTS.some((hint) => chunk.id.includes(hint));
  if (vcFlavored) adjustment *= 0.65;

  if (skills.some((s) => PM_FLAVOR_SKILLS.has(s))) adjustment *= 1.35;

  return adjustment;
}

// System prompt tone instructions per persona
export const PERSONA_TONE: Record<Persona, string> = {
  recruiter:
    "The visitor is a recruiter or hiring manager evaluating DJ for a product role (Product Owner / Product Manager, often for AI/ML-driven products). Frame answers around product competencies: discovering and validating user problems, prioritization and trade-offs, shipping with cross-functional teams, metric design and experiment-driven iteration (A/B tests), stakeholder alignment, and measurable outcomes. When AI/ML work appears in the context, lead with it — hands-on AI product building, working with engineers on model-based features, and connecting model capabilities to user experience and business numbers. Translate experiences into product terms — founding Flint is zero-to-one product ownership, platform deals with Apple/Meta/Google are stakeholder management and roadmap negotiation, the due diligence dashboard is shipping an internal AI product. Do NOT frame answers around becoming an investor or transitioning to VC; emphasize building and shipping.",
  vc:
    "The visitor is evaluating DJ for a venture capital role. Frame answers around what makes a strong VC candidate: founder evaluation instincts, investment thesis clarity, pattern recognition from operating experience, and the ability to support portfolio companies hands-on. Highlight the operator-to-investor edge — founding a startup, closing platform partnerships, driving revenue growth — as evidence of judgment and conviction.",
  founder_partner:
    "The visitor is a startup founder or a business development / partnerships professional. Frame answers around what resonates with builders and dealmakers: hands-on building experience, lessons from failure, product-market fit instincts, fundraising, deal negotiation, partnership structures, and the revenue impact of partnerships. Lead with specific stories — how deals were structured and closed, and what going from zero to one actually took.",
  curious_visitor:
    "The visitor is casually exploring. Provide a friendly, accessible overview. Avoid jargon. Give a well-rounded picture of background, skills, and interesting projects. Keep it conversational and easy to follow.",
};

// Steer the auto-generated <followup> suggestions per persona
export const PERSONA_FOLLOWUP_HINT: Record<Persona, string> = {
  recruiter:
    "Steer follow-up suggestions toward product management competencies, especially for AI/ML products: hands-on AI product building, product discovery and validation, metric design and A/B testing, shipping with engineers, measurable outcomes, and stakeholder management. Avoid suggesting questions about venture capital or investing.",
  vc:
    "Steer follow-up suggestions toward investor readiness: founder evaluation, judgment from operating experience, due diligence approach, and the operator-to-investor transition.",
  founder_partner:
    "Steer follow-up suggestions toward building and dealmaking: startup lessons, product-market fit, fundraising, partnership negotiation, and deal structures.",
  curious_visitor:
    "Steer follow-up suggestions toward broadly interesting topics: career story, notable projects, and memorable challenges.",
};

// System prompt focus-area instructions per focus
export const FOCUS_HIGHLIGHT: Record<Focus, string> = {
  business_development:
    "The visitor is especially interested in business development experience. Prioritize partnership stories, deal negotiations, revenue growth initiatives, GTM strategies, and client relationship management in your responses.",
  ai_llms:
    "The visitor is especially interested in AI and LLM experience. Prioritize RAG systems, generative AI tools (ChatGPT, Gemini), automation workflows, machine learning projects, and technical AI infrastructure in your responses.",
  leadership_strategy:
    "The visitor is especially interested in leadership and strategy. Prioritize team management, corporate strategy, organizational scaling, investor relations, and strategic decision-making stories in your responses.",
  full_stack:
    "Provide a well-rounded view across all experience areas. Balance technical, business, and leadership highlights.",
};

// Maps each focus to matching skill keywords (for Pinecone $in filter on skills field)
export const FOCUS_SKILL_TERMS: Record<Focus, string[]> = {
  business_development: [
    "partnership management",
    "business development",
    "deal negotiation",
    "strategic partnerships",
    "GTM strategy",
    "revenue growth",
    "investor relations",
    "fundraising",
    "enterprise sales",
    "revenue analysis",
    "partnership development",
  ],
  ai_llms: [
    "RAG",
    "RAG architecture",
    "generative AI",
    "ChatGPT",
    "OpenAI",
    "Gemini",
    "machine learning",
    "graph neural networks",
    "AI automation",
    "stable diffusion",
    "prompt engineering",
    "vector database",
  ],
  leadership_strategy: [
    "strategic planning",
    "cross-functional leadership",
    "corporate strategy",
    "stakeholder management",
    "product strategy",
    "team building",
    "startup founding",
    "product management",
  ],
  full_stack: [],
};

// 4 suggested questions per persona, bilingual (en/ko)
export const PERSONA_QUESTIONS: Record<Persona, Record<"en" | "ko", string[]>> = {
  recruiter: {
    en: [
      "What hands-on experience does DJ have building AI or ML-based products?",
      "Tell me about a product DJ took from zero to one.",
      "Tell me about a technically uncertain project DJ led end-to-end.",
      "What is DJ's perspective on AI agents and where they're heading?",
    ],
    ko: [
      "DJ가 AI/ML 기반 제품을 직접 만든 경험을 말씀해 주세요.",
      "DJ가 제품을 0에서 1로 만든 경험을 말씀해 주세요.",
      "기술적 불확실성이 큰 프로젝트를 끝까지 리딩한 경험이 있나요?",
      "AI 에이전트의 방향성에 대한 DJ의 관점은 무엇인가요?",
    ],
  },
  vc: {
    en: [
      "Why does DJ want to transition into venture capital?",
      "How would DJ's operator background help him as an investor?",
      "How does DJ evaluate early-stage startups?",
      "What did founding Flint teach DJ about the investor side?",
    ],
    ko: [
      "DJ가 왜 벤처캐피탈로 전환하려 하나요?",
      "DJ의 오퍼레이터 경험이 투자자로서 어떻게 도움이 되나요?",
      "DJ는 초기 스타트업을 어떻게 평가하나요?",
      "Flint 창업 경험이 투자자 관점에서 무엇을 가르쳐줬나요?",
    ],
  },
  founder_partner: {
    en: [
      "What did founding and shutting down Flint teach you?",
      "How did you build the Apple partnership from scratch?",
      "Describe your deal structure with Meta",
      "Tell me about a deal you walked away from",
    ],
    ko: [
      "Flint 창업과 종료에서 무엇을 배우셨나요?",
      "Apple 파트너십을 어떻게 처음부터 구축했나요?",
      "Meta와의 딜 구조를 설명해 주세요",
      "포기한 딜에 대해 말씀해 주세요",
    ],
  },
  curious_visitor: {
    en: [
      "Could you give me an overview of your career?",
      "What kind of work do you do?",
      "What projects are you most proud of?",
      "How did you get into tech?",
    ],
    ko: [
      "커리어에 대해 간단히 소개해 주시겠어요?",
      "어떤 일을 하시나요?",
      "가장 자랑스러운 프로젝트는 무엇인가요?",
      "어떻게 테크 분야에 입문하셨나요?",
    ],
  },
};

// Chunk IDs used for cold-start welcome message
export const CORE_STRENGTH_IDS = [
  "personal-summary",
  "narrative-career-trajectory",
  "narrative-partnership-expertise",
  "skills-expertise",
];
