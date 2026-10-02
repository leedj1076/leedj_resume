export interface Prototype {
  slug: string;
  filename: string;
  label: string;
  title: string;
  description: string;
  tags: readonly string[];
  accent: string;
  href?: string;
}

export const PROTOTYPES: readonly Prototype[] = [
  {
    slug: "v2-full-suite",
    filename: "ask-dj-v4.html",
    label: "V2",
    title: "Full Suite",
    description:
      "Gateway + 3 modes: Brief overview, Chat with evidence panel, Fit Analysis — dual theme, education, skills",
    tags: ["Fit Analysis", "Evidence Panel", "Dual Theme"],
    accent: "#8b5cf6",
  },
  {
    slug: "v3-narrative",
    filename: "ask-dj-narrative.html",
    label: "V3",
    title: "Narrative",
    description:
      "Story-driven chapters with progressive reveal, serif typography, timeline markers",
    tags: ["Chapters", "Timeline", "Serif"],
    accent: "#f59e0b",
  },
  {
    slug: "v4-signal-deck",
    filename: "ask-dj-signal.html",
    label: "V4",
    title: "Signal Deck",
    description:
      "Presentation deck with snap-scroll sections, evidence-first framing, cinematic feel",
    tags: ["Scroll-snap", "Deck", "Cinematic"],
    accent: "#10b981",
  },
  {
    slug: "v5-merged",
    filename: "ask-dj-merged-v2.html",
    label: "V5",
    title: "Merged",
    description:
      "No gateway — quick-scan grid, topic accordions, floating orbs, direct chat",
    tags: ["No Gateway", "Accordions", "Ambient"],
    accent: "#ec4899",
  },
  {
    slug: "v6-dd-room",
    filename: "ask-dj-dd-room.html",
    label: "V6",
    title: "DD Data Room",
    description:
      "VC due diligence data room — split-screen investment memo + DD copilot chat with citation cross-refs",
    tags: ["Split-Screen", "Memo", "Citations"],
    accent: "#ef4444",
  },
  {
    slug: "v7-terminal",
    filename: "ask-dj-terminal.html",
    label: "V7",
    title: "Hacker Terminal",
    description:
      "CLI data room — terminal commands, streaming RAG, CRT scanlines, command history, tab autocomplete",
    tags: ["CLI", "Monospace", "CRT"],
    accent: "#34d399",
  },
  {
    slug: "v8-memo",
    filename: "ask-dj-memo.html",
    label: "V8",
    title: "Living Memo",
    description:
      "Editorial investment memo — hover any paragraph to summon inline AI threads, Playfair serif, no chat window",
    tags: ["Editorial", "Inline AI", "Serif"],
    accent: "#6366f1",
  },
  {
    slug: "v9-ic-dashboard",
    filename: "ask-dj-ic-dashboard.html",
    label: "V9",
    title: "IC Dashboard",
    description:
      "VC deal management SaaS — tabbed deal review (thesis, metrics, risks, skills) + IC debate thread with deal sponsor AI",
    tags: ["Deal SaaS", "Tabbed", "IC Debate"],
    accent: "#0ea5e9",
  },
  {
    slug: "v10-altos-memo-hub",
    filename: "altos-memo-hub.html",
    label: "V10",
    title: "Memo Hub",
    description:
      "Candidate memo data room — sidebar nav, competency map, case studies, bilingual (EN/KR), dark/light theme. RAG not connected.",
    tags: ["Data Room", "Bilingual", "Sidebar Nav"],
    accent: "#f97316",
  },
  {
    slug: "v11-altos-final",
    filename: "ask-dj-altos-final.html",
    label: "V11",
    title: "Editorial Final",
    description:
      "Best-of merge per evaluation report — Source Serif 4 editorial memo, bilingual (EN/KR), inline AI threads, risk self-assessment, collapsible quick-scan sidebar",
    tags: ["Memo", "Bilingual", "Quick-Scan", "Risks"],
    accent: "#4f46e5",
  },
  {
    slug: "v12-auditable",
    filename: "ask-dj-v12-auditable.html",
    label: "V12",
    title: "Auditable Memo",
    description:
      "Evidence-first investment memo — 12 claim anchors with source popovers, 3 reading paths (90s/5min/Full DD), JD signal tags, section progress nav, streaming AI threads, default-open quick-scan",
    tags: ["Evidence Ledger", "Reading Paths", "JD Signals", "Streaming AI"],
    accent: "#7c3aed",
  },
  {
    slug: "v13-auditable-plus",
    filename: "ask-dj-v13-auditable.html",
    label: "V13",
    title: "Auditable+",
    description:
      "V12 + 6 improvements — JD coverage matrix, founder question framework (5 accordion cards), bull/bear IC synthesis, 90-day operating plan with failure triggers, upgraded evidence popovers (verification + confidence + invalidation), AI citation enforcement",
    tags: [
      "JD Matrix",
      "Bull/Bear",
      "90-Day Plan",
      "Founder Questions",
      "Citation AI",
    ],
    accent: "#4f46e5",
  },
  {
    slug: "v14-profile",
    filename: "ask-dj-v14-profile.html",
    label: "V14",
    title: "Interactive Profile",
    description:
      "Split-screen profile + chat — neutral palette, career timeline, stats grid, streaming AI chat with starter questions. Audience-neutral, no VC framing.",
    tags: ["Split-Screen", "Profile", "Chat", "Bilingual"],
    accent: "#22c55e",
    href: "/",
  },
];

export function findPrototype(slug: string): Prototype | undefined {
  return PROTOTYPES.find((prototype) => prototype.slug === slug);
}
