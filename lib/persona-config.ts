import type { Persona, Focus } from "./types";

// Multiplicative score adjustments per persona per section (for re-ranking)
export const PERSONA_SECTION_WEIGHTS: Record<Persona, Record<string, number>> = {
  vc_investor: {
    summary: 1.3,
    experience: 1.2,
    motivation: 1.4,
    founder_philosophy: 1.4,
    failure_learning: 1.3,
    ace_reputation: 1.3,
    career_transition: 1.3,
    narrative: 1.3,
    founder_empathy: 1.2,
    vc_commitment: 1.2,
    introduction: 1.1,
    project: 1.1,
    skills: 1.0,
    education: 0.8,
    awards: 0.7,
    leadership: 0.7,
  },
  corporate_strategy: {
    summary: 1.2,
    experience: 1.3,
    skills: 1.1,
    education: 1.0,
    project: 0.9,
    awards: 0.8,
    leadership: 0.8,
  },
  bd_partnerships: {
    summary: 1.1,
    experience: 1.4,
    project: 0.9,
    skills: 1.0,
    education: 0.7,
    awards: 0.7,
    leadership: 0.8,
  },
  hiring_manager: {
    summary: 1.0,
    experience: 1.1,
    skills: 1.2,
    education: 1.1,
    project: 1.1,
    awards: 1.0,
    leadership: 1.0,
  },
};

// System prompt tone instructions per persona
export const PERSONA_TONE: Record<Persona, string> = {
  vc_investor:
    "The visitor is from the VC or investment world. Frame answers around what makes a strong investor: founder evaluation instincts, investment thesis clarity, pattern recognition from operating experience, and the ability to support portfolio companies hands-on. Lead with specific examples that demonstrate judgment, conviction, and an operator-to-investor edge. Quantitative results matter as evidence of execution, not as the main story.",
  corporate_strategy:
    "The visitor is a corporate strategy professional. Emphasize strategic thinking, competitive analysis, market positioning, and cross-functional leadership. Frame experiences through organizational impact and long-term planning.",
  bd_partnerships:
    "The visitor is a business development / partnerships professional. Emphasize deal negotiation, partnership structures, relationship management, and revenue impact of partnerships. Share specific stories of how deals were structured and closed.",
  hiring_manager:
    "The visitor is a hiring manager. Provide a balanced view across technical skills, leadership, collaboration, and career progression. Highlight concrete achievements and transferable skills.",
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
  vc_investor: {
    en: [
      "Why do you want to transition from operator to VC?",
      "How would you evaluate an early-stage founder?",
      "What did founding and shutting down Flint teach you about investing?",
      "How did you build the Apple partnership from scratch?",
    ],
    ko: [
      "왜 오퍼레이터에서 VC로 전환하려 하나요?",
      "초기 단계 창업자를 어떻게 평가하시겠어요?",
      "플린트 창업과 종료가 투자에 대해 무엇을 가르쳤나요?",
      "Apple 파트너십을 어떻게 처음부터 구축했나요?",
    ],
  },
  corporate_strategy: {
    en: [
      "How did you shape product strategy at TmaxTibero?",
      "What was your approach to competitive analysis?",
      "How did you align engineering with business goals?",
      "Describe your experience with organizational scaling",
    ],
    ko: [
      "티맥스에서 어떻게 제품 전략을 수립했나요?",
      "경쟁 분석에 대한 접근 방식은 무엇인가요?",
      "엔지니어링과 사업 목표를 어떻게 조율했나요?",
      "조직 확장 경험을 설명해 주세요",
    ],
  },
  bd_partnerships: {
    en: [
      "How did you negotiate the Apple Vision Pro partnership?",
      "Describe your deal structure with Meta",
      "How do you approach new platform partnerships?",
      "Tell me about a deal you walked away from",
    ],
    ko: [
      "Apple Vision Pro 파트너십을 어떻게 협상했나요?",
      "Meta와의 딜 구조를 설명해 주세요",
      "새로운 플랫폼 파트너십에 어떻게 접근하나요?",
      "포기한 딜에 대해 말씀해 주세요",
    ],
  },
  hiring_manager: {
    en: [
      "What did you do at Devs United Games?",
      "What technologies do you work with?",
      "Tell me about your education",
      "Describe your partnership experience",
    ],
    ko: [
      "데브스 유나이티드에서 무엇을 하셨나요?",
      "어떤 기술을 다루시나요?",
      "학력에 대해 알려주세요",
      "파트너십 경험을 설명해 주세요",
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
