export type Lang = "en" | "kr";

type Bilingual = { en: string; kr: string };
type Localizable = string | Bilingual;

export function localize(value: Localizable, lang: Lang): string {
  if (typeof value === "string") return value;
  return value[lang] ?? value.en;
}

export interface Stat {
  label: Localizable;
  value: Localizable;
  detail: Localizable;
  chatQ: Bilingual;
}

export interface Highlight {
  id: string;
  title: Bilingual;
  text: Bilingual;
}

export interface TimelineEntry {
  period: Localizable;
  role: Localizable;
  company: Localizable;
  highlight: Localizable;
  chatQ: Bilingual;
}

export interface PortfolioItem {
  title: Bilingual;
  description: Bilingual;
  url: string;
  chatQ: Bilingual;
}

export const STATS: Stat[] = [
  {
    label: "Experience",
    value: "8+ years",
    detail: {
      en: "Engineer → Team Lead → Co-Founder/COO → Director B&P → Strategy",
      kr: "엔지니어 → 팀리드 → 공동창업자/COO → B&P 디렉터 → 전략",
    },
    chatQ: {
      en: "Walk me through DJ's career progression.",
      kr: "DJ의 커리어 발전 과정을 알려주세요.",
    },
  },
  {
    label: { en: "Revenue Impact", kr: "매출 임팩트" },
    value: "55.47% YoY",
    detail: {
      en: "Drove platform promotions, DLC strategy, and premium subscription programs at Devs United",
      kr: "Devs United에서 플랫폼 프로모션, DLC 전략, 프리미엄 구독 프로그램 주도",
    },
    chatQ: {
      en: "How did DJ achieve 55% revenue growth?",
      kr: "DJ는 어떻게 55% 매출 성장을 달성했나요?",
    },
  },
  {
    label: { en: "Fundraising", kr: "펀드레이징" },
    value: "₩450M",
    detail: {
      en: "Seed + gov't funding from Strong Ventures & Fast Ventures as co-founder",
      kr: "공동창업자로서 Strong Ventures & Fast Ventures에서 시드 + 정부 자금 유치",
    },
    chatQ: {
      en: "Tell me about DJ's fundraising experience.",
      kr: "DJ의 펀드레이징 경험에 대해 알려주세요.",
    },
  },
  {
    label: { en: "Technical", kr: "기술" },
    value: { en: "Ships code", kr: "코드 배포" },
    detail: {
      en: "Built RAG pipeline (this app), Next.js, Python, Unity, VisionOS, Hadoop/K8s",
      kr: "RAG 파이프라인(이 앱), Next.js, Python, Unity, VisionOS, Hadoop/K8s 구축",
    },
    chatQ: {
      en: "What's DJ's technical stack?",
      kr: "DJ의 기술 스택은 무엇인가요?",
    },
  },
  {
    label: { en: "Languages", kr: "언어" },
    value: "KR · EN · DE",
    detail: {
      en: "Native bilingual + TestDaF 5/5/4/5 German",
      kr: "네이티브 이중언어 + TestDaF 5/5/4/5 독일어",
    },
    chatQ: {
      en: "What languages does DJ speak?",
      kr: "DJ는 어떤 언어를 구사하나요?",
    },
  },
  {
    label: { en: "Education", kr: "학력" },
    value: "KAIST + KIT",
    detail: {
      en: "B.S. Mech. Eng. + Industrial Design (Cum Laude), M.S. dual degree with KIT",
      kr: "기계공학 + 산업디자인 학사 (우등졸업), KIT 석사 복수학위",
    },
    chatQ: {
      en: "Tell me about DJ's education.",
      kr: "DJ의 학력에 대해 알려주세요.",
    },
  },
];

export const HIGHLIGHTS: Highlight[] = [
  {
    id: "platforms",
    title: { en: "Platform Partnerships", kr: "플랫폼 파트너십" },
    text: {
      en: 'At Devs United Games, I didn\'t just "do BD." I built the company\'s entire global distribution channel. Meta Quest+, Apple Vision Pro, Google Android XR — each required navigating different platform politics, different negotiation cultures, and different technical requirements. The 55% YoY revenue growth wasn\'t from one big deal. It was from building repeatable partnership playbooks across three very different ecosystems.',
      kr: 'Devs United Games에서 단순히 "BD를 했다"가 아닙니다. 회사의 전체 글로벌 유통 채널을 구축했습니다. Meta Quest+, Apple Vision Pro, Google Android XR — 각각 다른 플랫폼 정치, 다른 협상 문화, 다른 기술 요구사항을 탐색해야 했습니다. 55% YoY 매출 성장은 하나의 큰 딜이 아닌, 세 가지 매우 다른 생태계에서 반복 가능한 파트너십 플레이북을 구축한 결과입니다.',
    },
  },
  {
    id: "failure",
    title: { en: "What I Learned from Failure", kr: "실패에서 배운 것" },
    text: {
      en: 'Flint Technologies was my most expensive education. We raised ₩450M in seed and government funding, built a genuinely novel GNN-powered knowledge platform, and grew to 860+ users with zero marketing spend. Then it died. Not because the tech was bad — it was ahead of its time. It died because we optimized for algorithmic sophistication over user experience. The GNN required users to manually connect notes as nodes — that manual friction killed adoption even with AI assistance. I learned the difference between "technically validated" and "market-ready" the hard way. That lesson now shapes every product and partnership decision I make.',
      kr: 'Flint Technologies는 가장 비싼 교육이었습니다. 시드 및 정부 자금으로 4.5억원을 유치하고, 진정으로 혁신적인 GNN 기반 지식 플랫폼을 구축하고, 마케팅 비용 없이 860명 이상의 사용자를 확보했습니다. 그리고 실패했습니다. 기술이 나빠서가 아닙니다 — 시대를 앞섰습니다. 사용자 경험보다 알고리즘 정교함을 최적화했기 때문입니다. GNN은 사용자가 수동으로 노트를 노드로 연결해야 했고, 그 수동 마찰이 AI 지원에도 불구하고 채택을 저해했습니다. "기술적으로 검증된 것"과 "시장 준비가 된 것"의 차이를 어렵게 배웠습니다. 그 교훈이 이제 모든 제품과 파트너십 결정을 형성합니다.',
    },
  },
  {
    id: "enterprise",
    title: { en: "Enterprise Sales DNA", kr: "엔터프라이즈 영업 DNA" },
    text: {
      en: "Before startups, I spent three years at TmaxTibero — first as a Software Engineer building Big Data and autonomous database systems, then promoted to Team Lead managing enterprise DBMS migrations for Samsung Electronics and Hyundai. Korean enterprise sales is relationship-driven and hierarchical — you don't just pitch a product, you navigate internal politics across multiple stakeholders over months. That experience gave me a muscle that most technical founders lack: the ability to sit in a room with enterprise executives, earn their trust, and turn a technical conversation into a commercial outcome.",
      kr: "스타트업 이전, TmaxTibero에서 3년간 — 먼저 소프트웨어 엔지니어로 빅데이터와 자율 데이터베이스 시스템을 구축하고, 이후 팀리드로 승진하여 삼성전자와 현대의 기업 DBMS 마이그레이션을 관리했습니다. 한국 기업 영업은 관계 중심이고 위계적입니다 — 단순히 제품을 피칭하는 것이 아니라, 수개월에 걸쳐 여러 이해관계자의 내부 정치를 탐색합니다. 그 경험은 대부분의 기술 창업자에게 없는 근육을 만들었습니다: 기업 임원과 한 방에 앉아 신뢰를 얻고, 기술 대화를 상업적 결과로 전환하는 능력.",
    },
  },
];

export const TIMELINE: TimelineEntry[] = [
  {
    period: { en: "2026 – Present", kr: "2026 – 현재" },
    role: { en: "Strategy & Market Research", kr: "전략 & 시장 조사" },
    company: { en: "Changjo Architecture", kr: "창조건축" },
    highlight: {
      en: "Company evaluation across Space, GenAI, and Smart Agriculture; built due diligence dashboard",
      kr: "우주, GenAI, 스마트 농업 분야 기업 평가; 실사 대시보드 구축",
    },
    chatQ: {
      en: "What is DJ working on now?",
      kr: "DJ는 현재 무엇을 하고 있나요?",
    },
  },
  {
    period: "2024 – 2025",
    role: { en: "Director, Business & Publishing", kr: "사업 및 퍼블리싱 디렉터" },
    company: "Devs United Games",
    highlight: {
      en: "55.47% YoY revenue growth; Meta, Apple, Google partnerships",
      kr: "55.47% YoY 매출 성장; Meta, Apple, Google 파트너십",
    },
    chatQ: {
      en: "Tell me about the Meta Quest+ partnership.",
      kr: "Meta Quest+ 파트너십에 대해 알려주세요.",
    },
  },
  {
    period: "2023 – 2024",
    role: { en: "Business Development", kr: "사업 개발" },
    company: { en: "Changjo Architecture", kr: "창조건축" },
    highlight: {
      en: "Launched indoor farming initiative; created Smart Farm division",
      kr: "실내 농업 이니셔티브 런칭; 스마트팜 사업부 설립",
    },
    chatQ: {
      en: "Tell me about DJ's work in smart agriculture.",
      kr: "DJ의 스마트 농업 관련 업무에 대해 알려주세요.",
    },
  },
  {
    period: "2021 – 2024",
    role: { en: "Co-Founder & COO", kr: "공동창업자 & COO" },
    company: "Flint Technologies",
    highlight: {
      en: "GNN knowledge platform, ₩450M seed + gov't funding at $2.1M valuation",
      kr: "GNN 지식 플랫폼, 4.5억 시드 + 정부 자금, $2.1M 밸류에이션",
    },
    chatQ: {
      en: "What did DJ learn from his startup failure?",
      kr: "스타트업 실패에서 무엇을 배웠나요?",
    },
  },
  {
    period: "2018 – 2021",
    role: { en: "Software Engineer → Team Lead", kr: "소프트웨어 엔지니어 → 팀리드" },
    company: "TmaxTibero",
    highlight: {
      en: "Enterprise DBMS migrations for Samsung, Hyundai; Big Data & Cloud R&D",
      kr: "삼성, 현대 기업 DBMS 마이그레이션; 빅데이터 & 클라우드 R&D",
    },
    chatQ: {
      en: "How does DJ approach enterprise sales?",
      kr: "DJ는 엔터프라이즈 영업을 어떻게 접근하나요?",
    },
  },
  {
    period: "2010 – 2018",
    role: {
      en: "B.S. + M.S. Mechanical Engineering",
      kr: "기계공학 학사 + 석사",
    },
    company: { en: "KAIST + KIT (Germany)", kr: "KAIST + KIT (독일)" },
    highlight: {
      en: "Double major w/ Industrial Design, Cum Laude, Dean's List, KIT dual degree",
      kr: "산업디자인 복수전공, 우등졸업, 학장 리스트, KIT 복수학위",
    },
    chatQ: {
      en: "Tell me about DJ's education.",
      kr: "DJ의 학력에 대해 알려주세요.",
    },
  },
];

export const PORTFOLIO: PortfolioItem[] = [
  {
    title: {
      en: "Space Investment Intelligence Platform",
      kr: "우주 투자 인텔리전스 플랫폼",
    },
    description: {
      en: "AI-powered investment research dashboard profiling 115+ space companies with automated deep research, dual-rubric scoring, and multi-model investment committee debate.",
      kr: "115개 이상의 우주 기업을 프로파일링하는 AI 기반 투자 리서치 대시보드. 자동화된 심층 리서치, 이중 루브릭 스코어링, 멀티모델 투자위원회 토론 기능.",
    },
    url: "https://cja-space-h.vercel.app",
    chatQ: {
      en: "Tell me about the Space Investment Intelligence Platform.",
      kr: "우주 투자 인텔리전스 플랫폼에 대해 알려주세요.",
    },
  },
];

export const V14_PERSONA_OPTIONS: { value: string; en: string; kr: string }[] = [
  { value: "hiring_manager", en: "Hiring Manager", kr: "채용 담당자" },
  { value: "vc_investor", en: "Investor", kr: "투자자" },
  { value: "bd_partnerships", en: "Partner", kr: "파트너" },
  { value: "curious_visitor", en: "Curious Visitor", kr: "방문자" },
];

export const STARTER_QUESTIONS: Record<Lang, string[]> = {
  en: [
    "What makes DJ different from other candidates?",
    "Tell me about the Meta Quest+ partnership.",
    "What did DJ learn from his startup failure?",
    "What's DJ's technical stack?",
    "How does DJ approach business development?",
    "What was DJ's role at Flint Technologies?",
  ],
  kr: [
    "DJ를 다른 후보자와 차별화하는 것은 무엇인가요?",
    "Meta Quest+ 파트너십에 대해 알려주세요.",
    "스타트업 실패에서 무엇을 배웠나요?",
    "DJ의 기술 스택은 무엇인가요?",
    "DJ는 사업개발을 어떻게 접근하나요?",
    "Flint Technologies에서의 역할은 무엇이었나요?",
  ],
};

export const PERSONA_STARTER_QUESTIONS: Partial<Record<string, Record<Lang, string[]>>> = {
  vc_investor: {
    en: [
      "Why is DJ transitioning from operator to VC?",
      "How would DJ support portfolio companies?",
      "How does DJ evaluate early-stage startups?",
      "What did founding a startup teach DJ about investing?",
      "How did DJ build the Apple and Meta partnerships?",
      "What was DJ's fundraising experience at Flint?",
    ],
    kr: [
      "DJ는 왜 오퍼레이터에서 VC로 전환하려는 건가요?",
      "DJ는 포트폴리오 기업을 어떻게 지원할 수 있나요?",
      "DJ는 초기 스타트업을 어떻게 평가하나요?",
      "창업 경험이 투자에 대해 무엇을 가르쳐줬나요?",
      "Apple과 Meta 파트너십을 어떻게 구축했나요?",
      "Flint에서의 투자유치 경험에 대해 알려주세요.",
    ],
  },
};
