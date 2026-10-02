import { PERSONA_OPTIONS } from "./domain/personas";
import type { Language } from "./domain/language";

export type Lang = Language;

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
      en: "B.S. Mech. Eng. + Industrial Design (Cum Laude), M.S. with research at KIT Germany",
      kr: "기계공학 + 산업디자인 학사 (우등졸업), 독일 KIT 연구과정 석사",
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
    period: { en: "Feb 2026 – Present", kr: "2026.02 – 현재" },
    role: { en: "Strategy & Market Research", kr: "전략 & 시장 조사" },
    company: { en: "Changjo Architecture", kr: "창조건축" },
    highlight: {
      en: "Leading company evaluation across space, GenAI, and smart agriculture. Built a due diligence rubric and AI dashboard for structured assessment.",
      kr: "우주, GenAI, 스마트 농업 분야 기업 평가 주도. 구조화된 평가를 위한 실사 루브릭과 AI 대시보드 구축.",
    },
    chatQ: {
      en: "Could you tell me about your current role at Changjo Architecture?",
      kr: "현재 창조건축에서의 역할에 대해 말씀해 주시겠어요?",
    },
  },
  {
    period: { en: "Feb 2024 – Aug 2025", kr: "2024.02 – 2025.08" },
    role: {
      en: "Director, Business & Publishing",
      kr: "사업 및 퍼블리싱 디렉터",
    },
    company: "Devs United Games",
    highlight: {
      en: "Secured Meta Quest+, launched on Apple Vision Pro (App Store Awards finalist), initiated Google Android XR. 55% YoY revenue growth.",
      kr: "Meta Quest+ 진입, Apple Vision Pro 출시(App Store Awards 파이널리스트), Google Android XR 시작. 매출 55% YoY 성장.",
    },
    chatQ: {
      en: "What did you do at Devs United Games?",
      kr: "Devs United Games에서 어떤 일을 하셨나요?",
    },
  },
  {
    period: { en: "Sep 2023 – Feb 2024", kr: "2023.09 – 2024.02" },
    role: { en: "Business Development", kr: "사업 개발" },
    company: { en: "Changjo Architecture", kr: "창조건축" },
    highlight: {
      en: "Launched greenfield indoor farming initiative. Built and operated setups from scratch; created dedicated Smart Farm division.",
      kr: "실내 농업 사업을 처음부터 기획·런칭. 직접 설비 구축·운영; 스마트팜 전담 사업부 신설.",
    },
    chatQ: {
      en: "Could you tell me about your business development work at Changjo?",
      kr: "창조건축에서의 사업 개발 업무에 대해 말씀해 주시겠어요?",
    },
  },
  {
    period: { en: "May 2021 – Feb 2024", kr: "2021.05 – 2024.02" },
    role: { en: "Co-Founder & COO", kr: "공동창업자 & COO" },
    company: "Flint Technologies",
    highlight: {
      en: "Defined MVP and GTM across four co-founders. Raised ₩450M from Strong & Fast Ventures at $2.1M valuation; wound down after two pivots.",
      kr: "4인 공동창업 팀에서 MVP·GTM 전략 수립. Strong & Fast Ventures로부터 $2.1M 밸류에이션에 4.5억 유치; 두 번의 피봇 후 사업 종료.",
    },
    chatQ: {
      en: "Could you tell me about your experience co-founding Flint?",
      kr: "Flint 공동창업 경험에 대해 말씀해 주시겠어요?",
    },
  },
  {
    period: { en: "Feb 2018 – May 2021", kr: "2018.02 – 2021.05" },
    role: {
      en: "Software Engineer → Team Lead",
      kr: "소프트웨어 엔지니어 → 팀리드",
    },
    company: "TmaxTibero",
    highlight: {
      en: "Enterprise DB migrations for Samsung and Hyundai; built distributed infrastructure (Hadoop, K8s). Promoted to Team Lead, Achievement Award.",
      kr: "삼성, 현대 대상 엔터프라이즈 DB 마이그레이션; 분산 인프라(Hadoop, K8s) 구축. 팀리드 승진, 공로상 수상.",
    },
    chatQ: {
      en: "What did you do at TmaxTibero?",
      kr: "TmaxTibero에서 어떤 일을 하셨나요?",
    },
  },
  {
    period: { en: "Sep 2010 – Feb 2018", kr: "2010.09 – 2018.02" },
    role: {
      en: "B.S. + M.S. Mechanical Engineering",
      kr: "기계공학 학사 + 석사",
    },
    company: { en: "KAIST + KIT (Germany)", kr: "KAIST + KIT (독일)" },
    highlight: {
      en: "Double major with Industrial Design, Cum Laude. Research at KIT Germany.",
      kr: "산업디자인 복수전공, 우등졸업. 독일 KIT 연구과정.",
    },
    chatQ: {
      en: "Could you tell me about your time at KAIST and KIT?",
      kr: "KAIST와 KIT에서의 학업에 대해 말씀해 주시겠어요?",
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

export const V14_PERSONA_OPTIONS: { value: string; en: string; kr: string }[] =
  PERSONA_OPTIONS.map((option) => ({ ...option }));

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

export const PERSONA_STARTER_QUESTIONS: Partial<
  Record<string, Record<Lang, string[]>>
> = {
  recruiter: {
    en: [
      "What hands-on experience does DJ have building AI or ML-based products?",
      "Tell me about a product DJ took from zero to one.",
      "Tell me about a technically uncertain project DJ led end-to-end.",
      "How does DJ design metrics and use A/B testing to improve a product?",
      "What measurable outcomes has DJ driven as a product owner?",
      "What is DJ's perspective on AI agents and where they're heading?",
    ],
    kr: [
      "DJ가 AI/ML 기반 제품을 직접 만든 경험을 말씀해 주세요.",
      "DJ가 제품을 0에서 1로 만든 경험을 말씀해 주세요.",
      "기술적 불확실성이 큰 프로젝트를 끝까지 리딩한 경험이 있나요?",
      "DJ는 지표 설계와 A/B 테스트를 어떻게 활용하나요?",
      "DJ가 프로덕트 오너로서 만든 측정 가능한 성과는 무엇인가요?",
      "AI 에이전트의 방향성에 대한 DJ의 관점은 무엇인가요?",
    ],
  },
  vc: {
    en: [
      "Why does DJ want to transition into venture capital?",
      "How would DJ's operator background help him support portfolio companies?",
      "How does DJ evaluate early-stage startups?",
      "What did founding Flint teach DJ about the investor side?",
      "Could you walk me through DJ's career trajectory?",
      "How does DJ bridge technical diligence and business judgment?",
    ],
    kr: [
      "DJ가 왜 벤처캐피탈로 전환하려 하나요?",
      "DJ의 오퍼레이터 경험이 포트폴리오 기업 지원에 어떻게 도움이 되나요?",
      "DJ는 초기 스타트업을 어떻게 평가하나요?",
      "Flint 창업 경험이 투자자 관점에서 무엇을 가르쳐줬나요?",
      "DJ의 커리어 여정을 설명해 주시겠어요?",
      "DJ는 기술 실사와 비즈니스 판단을 어떻게 연결하나요?",
    ],
  },
  founder_partner: {
    en: [
      "What did founding Flint teach you about building products?",
      "How did you build the Apple partnership from scratch?",
      "Could you tell me about the Meta Quest+ revenue deal?",
      "What's the hardest lesson you learned from startup failure?",
      "How do you handle complex multi-stakeholder negotiations?",
      "Could you tell me about your fundraising experience at Flint?",
    ],
    kr: [
      "Flint 창업이 제품 만들기에 대해 무엇을 가르쳐줬나요?",
      "Apple 파트너십을 어떻게 처음부터 구축했나요?",
      "Meta Quest+ 수익 딜에 대해 말씀해 주시겠어요?",
      "스타트업 실패에서 배운 가장 어려운 교훈은 무엇인가요?",
      "복잡한 다자간 협상을 어떻게 처리하시나요?",
      "Flint에서의 투자유치 경험에 대해 말씀해 주시겠어요?",
    ],
  },
  curious_visitor: {
    en: [
      "Could you give me an overview of your career?",
      "What kind of work do you do?",
      "What projects are you most proud of?",
      "What's the most interesting challenge you've faced?",
      "How did you get into tech?",
      "What are you working on these days?",
    ],
    kr: [
      "커리어에 대해 간단히 소개해 주시겠어요?",
      "어떤 일을 하시나요?",
      "가장 자랑스러운 프로젝트는 무엇인가요?",
      "가장 흥미로웠던 도전은 무엇이었나요?",
      "어떻게 테크 분야에 입문하셨나요?",
      "요즘은 어떤 일을 하고 계신가요?",
    ],
  },
  developer_partnerships: {
    en: [
      "How did DJ build platform partnerships with Apple, Meta, and Google from scratch?",
      "How would DJ design a developer program to recruit and onboard studios at scale?",
      "Could you walk me through the Apple Vision Pro partnership?",
      "What's DJ's experience with XR and spatial computing platforms?",
      "How does DJ use AI-assisted tools to build and ship products?",
      "How does DJ build trust with technical partners across different cultures?",
    ],
    kr: [
      "DJ가 Apple, Meta, Google과의 플랫폼 파트너십을 어떻게 처음부터 구축했나요?",
      "DJ라면 스튜디오를 대규모로 모집하고 온보딩하는 개발자 프로그램을 어떻게 설계할까요?",
      "Apple Vision Pro 파트너십 과정을 설명해 주시겠어요?",
      "XR과 공간 컴퓨팅 플랫폼에 대한 DJ의 경험은 무엇인가요?",
      "DJ는 AI 도구를 활용해 제품을 어떻게 만들고 출시하나요?",
      "DJ는 서로 다른 문화권의 기술 파트너와 어떻게 신뢰를 쌓나요?",
    ],
  },
};
