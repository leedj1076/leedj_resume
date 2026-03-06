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
  company: Localizable;
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
      en: "Could you walk me through your career progression?",
      kr: "커리어 발전 과정을 설명해 주시겠어요?",
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
      en: "How did you achieve 55% revenue growth?",
      kr: "55% 매출 성장을 어떻게 달성하셨나요?",
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
      en: "Could you tell me about your fundraising experience?",
      kr: "펀드레이징 경험에 대해 말씀해 주시겠어요?",
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
      en: "Could you describe your technical background?",
      kr: "기술적 배경에 대해 설명해 주시겠어요?",
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
      en: "What languages do you speak?",
      kr: "어떤 언어를 구사하시나요?",
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
      en: "Could you tell me about your education?",
      kr: "학력에 대해 말씀해 주시겠어요?",
    },
  },
];

export const HIGHLIGHTS: Highlight[] = [
  {
    id: "platforms",
    title: { en: "Platform Partnerships", kr: "플랫폼 파트너십" },
    text: {
      en: "At Devs United Games, I led the Apple partnership from cold outreach to launch — navigating indirect communication channels, delivering iterative demos to build trust, and shipping Fishing Haven on Vision Pro as an Apple App Store Awards finalist within 9 months. I secured Meta Quest+ entry after assessing cannibalization risk, driving 55.47% YoY revenue growth. When a Meta funding deal didn't serve the company's long-term interests, I walked away. I initiated the Google Android XR partnership by leveraging our track record on the other two platforms, negotiating dev kit access and upfront payment terms.",
      kr: "Devs United Games에서 Apple 파트너십을 콜드 아웃리치에서 런칭까지 이끌었습니다 — 간접적 커뮤니케이션 채널을 탐색하고, 반복적 데모로 신뢰를 구축하여, 9개월 만에 Fishing Haven을 Vision Pro에서 Apple App Store Awards 파이널리스트로 출시했습니다. 잠식 리스크를 분석한 후 Meta Quest+ 진입을 확보하여 55.47% YoY 매출 성장을 달성했습니다. Meta 펀딩 딜이 회사의 장기 이익에 부합하지 않을 때는 과감히 포기했습니다. 다른 두 플랫폼에서의 실적을 활용하여 Google Android XR 파트너십을 시작하고, 개발 키트 접근과 선지급 조건을 협상했습니다.",
    },
  },
  {
    id: "failure",
    title: { en: "What I Learned from Failure", kr: "실패에서 배운 것" },
    text: {
      en: "At Flint Technologies, we raised seed funding from Strong Ventures and Fast Ventures at a $2.1M valuation, plus government grants totaling ₩450M. I defined the MVP and built a data-driven decision culture across four co-founders — when we disagreed on direction, we tested competing UIs and landing pages and let real user data decide. We navigated two product pivots before concluding we hadn't achieved product-market fit. The hardest lesson: starting from impressive technology instead of desperate user pain. That experience sharpened a problem-first lens I now apply to every decision — validate the behavior loop early, and if adoption friction is core, solve it decisively or stop.",
      kr: "Flint Technologies에서 Strong Ventures와 Fast Ventures로부터 $2.1M 밸류에이션으로 시드 투자를 유치하고, 정부 보조금을 포함해 총 4.5억원을 확보했습니다. MVP를 정의하고 네 명의 공동창업자 간 데이터 기반 의사결정 문화를 구축했습니다 — 방향에 대해 의견이 갈릴 때, 경쟁 UI와 랜딩 페이지를 테스트하고 실제 사용자 데이터로 결정했습니다. 두 번의 제품 피봇을 거친 후 제품-시장 적합성을 달성하지 못했다고 결론 내렸습니다. 가장 어려운 교훈: 절실한 사용자 문제가 아닌 인상적인 기술에서 출발한 것. 그 경험이 이제 모든 결정에 적용하는 문제 우선 렌즈를 날카롭게 만들었습니다 — 행동 루프를 일찍 검증하고, 채택 마찰이 핵심이면 단호히 해결하거나 멈추라.",
    },
  },
  {
    id: "enterprise",
    title: { en: "Enterprise Sales DNA", kr: "엔터프라이즈 영업 DNA" },
    text: {
      en: "Before startups, I spent three years at TmaxTibero — first as a Software Engineer developing distributed data infrastructure with Hadoop and Kubernetes and collaborating on an autonomous database system, then promoted to Team Lead. As Team Lead, I translated enterprise infrastructure needs into product roadmaps through technical discovery and strategic planning with C-level stakeholders at Samsung Electronics and Hyundai. I benchmarked database platforms like Oracle and Microsoft and researched global trends in cloud infrastructure and AI-driven data systems. I received an Achievement Award for exceeding client expectations. That experience gave me a muscle most technical founders lack: bridging R&D and enterprise needs under pressure.",
      kr: "스타트업 이전, TmaxTibero에서 3년간 — 먼저 소프트웨어 엔지니어로 Hadoop과 Kubernetes 기반 분산 데이터 인프라를 개발하고 자율 데이터베이스 시스템에 협업한 후, 팀리드로 승진했습니다. 팀리드로서 삼성전자와 현대의 C레벨 이해관계자와 기술 탐색 및 전략 기획을 통해 엔터프라이즈 인프라 요구사항을 제품 로드맵으로 전환했습니다. Oracle, Microsoft 등 데이터베이스 플랫폼을 벤치마킹하고 클라우드 인프라 및 AI 기반 데이터 시스템의 글로벌 트렌드를 연구했습니다. 고객 기대를 초과 달성하여 공로상을 수상했습니다. 그 경험은 대부분의 기술 창업자에게 없는 근육을 만들었습니다: 압박 속에서 R&D와 엔터프라이즈 요구를 연결하는 능력.",
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
      en: "What are you currently working on?",
      kr: "현재 어떤 일을 하고 계신가요?",
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
      en: "Could you walk me through the Meta Quest+ partnership?",
      kr: "Meta Quest+ 파트너십 과정을 설명해 주시겠어요?",
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
      en: "Could you tell me about your work in smart agriculture?",
      kr: "스마트 농업 관련 업무에 대해 말씀해 주시겠어요?",
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
      en: "What did you learn from your startup experience at Flint?",
      kr: "Flint에서의 창업 경험에서 무엇을 배우셨나요?",
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
      en: "How do you approach enterprise sales?",
      kr: "엔터프라이즈 영업을 어떻게 접근하시나요?",
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
      en: "Could you tell me about your education?",
      kr: "학력에 대해 말씀해 주시겠어요?",
    },
  },
];

export const PORTFOLIO: PortfolioItem[] = [
  // — Changjo Architecture —
  {
    company: { en: "Changjo Architecture", kr: "창조건축" },
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
      en: "Could you walk me through the Space Investment Intelligence Platform?",
      kr: "우주 투자 인텔리전스 플랫폼에 대해 설명해 주시겠어요?",
    },
  },
  // — Devs United Games —
  {
    company: "Devs United Games",
    title: {
      en: "Apple Immersive Video Analysis",
      kr: "Apple Immersive Video 분석",
    },
    description: {
      en: "Research on filming techniques, human factors, directing grammar, and production lifecycle for Apple's 180° stereoscopic 3D format on Vision Pro.",
      kr: "Apple의 Vision Pro 180° 입체 3D 포맷을 위한 촬영 기법, 인체공학, 연출 문법, 프로덕션 라이프사이클 분석.",
    },
    url: "/dj/apple-immersive-video",
    chatQ: {
      en: "What motivated your research on Apple Immersive Video?",
      kr: "Apple Immersive Video 연구를 하게 된 계기가 무엇인가요?",
    },
  },
  {
    company: "Devs United Games",
    title: {
      en: "The First Breakout Game: Platform-Defining Games",
      kr: "최초의 브레이크아웃 게임: 플랫폼을 정의한 게임들",
    },
    description: {
      en: "Analysis of how every computing platform produced a defining game — from Solitaire to Beat Saber — and what that pattern means for the first smart glasses game.",
      kr: "솔리테어부터 비트 세이버까지, 모든 컴퓨팅 플랫폼이 자신을 정의하는 게임을 만들어낸 패턴 분석과 스마트 글래스 첫 게임에 대한 시사점.",
    },
    url: "/dj/breakout-game-analysis",
    chatQ: {
      en: "What is your analysis on platform-defining games?",
      kr: "플랫폼을 정의하는 게임에 대한 분석을 들려주시겠어요?",
    },
  },
  // — Flint Technologies —
  {
    company: "Flint Technologies",
    title: {
      en: "B2B SaaS and the Knowledge Management Problem",
      kr: "B2B SaaS와 지식 관리 문제",
    },
    description: {
      en: "Structural analysis of why knowledge management tools struggle as businesses — the backend/frontend divide, the human nature problem, and the algorithm threshold.",
      kr: "지식 관리 도구가 비즈니스로 어려움을 겪는 구조적 분석 — 백엔드/프론트엔드 구분, 인간 본성 문제, 알고리즘 임계점.",
    },
    url: "/dj/b2b-saas-km-analysis",
    chatQ: {
      en: "What are your views on B2B SaaS in knowledge management?",
      kr: "지식 관리 분야 B2B SaaS에 대한 견해를 들려주시겠어요?",
    },
  },
  {
    company: "Flint Technologies",
    title: {
      en: "Flint: Knowledge Management Crisis Analysis",
      kr: "Flint: 지식 관리 위기 분석",
    },
    description: {
      en: "Analysis of the information debt problem and Flint's AI-powered approach using GNN to close the gap between knowledge collection and utilization.",
      kr: "정보 부채 문제 분석과 GNN 기반 AI로 지식 수집과 활용 간 격차를 해소하는 Flint의 접근 방식.",
    },
    url: "/dj/flint-analysis",
    chatQ: {
      en: "Could you tell me about the knowledge management problem Flint was solving?",
      kr: "Flint가 해결하려 했던 지식 관리 문제에 대해 말씀해 주시겠어요?",
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
    "What sets you apart from other candidates?",
    "Could you walk me through the Meta Quest+ partnership?",
    "What did you learn from your startup experience at Flint?",
    "Could you describe your technical background?",
    "How do you typically approach business development?",
    "What was your role at Flint Technologies?",
  ],
  kr: [
    "다른 후보자와 차별화되는 점은 무엇인가요?",
    "Meta Quest+ 파트너십 과정을 설명해 주시겠어요?",
    "Flint에서의 창업 경험에서 무엇을 배우셨나요?",
    "기술적 배경에 대해 설명해 주시겠어요?",
    "사업개발을 보통 어떻게 접근하시나요?",
    "Flint Technologies에서의 역할은 무엇이었나요?",
  ],
};

export const PERSONA_STARTER_QUESTIONS: Partial<Record<string, Record<Lang, string[]>>> = {
  vc_investor: {
    en: [
      "What motivates your transition from operator to VC?",
      "How would you support portfolio companies?",
      "How do you evaluate early-stage startups?",
      "What did founding a startup teach you about investing?",
      "Could you walk me through how you built the Apple and Meta partnerships?",
      "Could you tell me about your fundraising experience at Flint?",
    ],
    kr: [
      "오퍼레이터에서 VC로 전환하려는 동기가 무엇인가요?",
      "포트폴리오 기업을 어떻게 지원하시겠어요?",
      "초기 스타트업을 어떻게 평가하시나요?",
      "창업 경험이 투자에 대해 무엇을 가르쳐줬나요?",
      "Apple과 Meta 파트너십을 구축한 과정을 설명해 주시겠어요?",
      "Flint에서의 투자유치 경험에 대해 말씀해 주시겠어요?",
    ],
  },
};
