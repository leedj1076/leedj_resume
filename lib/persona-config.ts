import type { Persona, Focus } from "./types";

// Multiplicative score adjustments per persona per section (for re-ranking)
export const PERSONA_SECTION_WEIGHTS: Record<Persona, Record<string, number>> = {
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
  founder: {
    experience: 1.4,
    founder_philosophy: 1.4,
    failure_learning: 1.4,
    project: 1.3,
    motivation: 1.3,
    narrative: 1.2,
    founder_empathy: 1.2,
    summary: 1.1,
    skills: 1.0,
    education: 0.8,
    awards: 0.7,
    leadership: 0.8,
  },
  partner: {
    summary: 1.1,
    experience: 1.4,
    project: 0.9,
    skills: 1.0,
    education: 0.7,
    awards: 0.7,
    leadership: 0.8,
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

// System prompt tone instructions per persona
export const PERSONA_TONE: Record<Persona, string> = {
  vc:
    "The visitor is evaluating DJ for a venture capital role. Frame answers around what makes a strong VC candidate: founder evaluation instincts, investment thesis clarity, pattern recognition from operating experience, and the ability to support portfolio companies hands-on. Highlight the operator-to-investor edge — founding a startup, closing platform partnerships, driving revenue growth — as evidence of judgment and conviction.",
  founder:
    "The visitor is a startup founder. Frame answers around what resonates with founders: hands-on building experience, lessons from failure, product-market fit instincts, fundraising, and the grit of going from zero to one. Lead with specific stories that show empathy for the founder journey.",
  partner:
    "The visitor is a business development or partnerships professional. Emphasize deal negotiation, partnership structures, relationship management, and revenue impact of partnerships. Share specific stories of how deals were structured and closed.",
  curious_visitor:
    "The visitor is casually exploring. Provide a friendly, accessible overview. Avoid jargon. Give a well-rounded picture of background, skills, and interesting projects. Keep it conversational and easy to follow.",
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
  founder: {
    en: [
      "What did founding and shutting down Flint teach you?",
      "How did you build the Apple partnership from scratch?",
      "What's your approach to finding product-market fit?",
      "How did you make decisions with four co-founders?",
    ],
    ko: [
      "Flint 창업과 종료에서 무엇을 배우셨나요?",
      "Apple 파트너십을 어떻게 처음부터 구축했나요?",
      "제품-시장 적합성을 찾는 접근 방식은 어떤가요?",
      "네 명의 공동창업자와 어떻게 의사결정했나요?",
    ],
  },
  partner: {
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
