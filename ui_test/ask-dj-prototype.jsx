import { useState, useRef, useEffect, useCallback } from "react";

// ─── MOCK DATA (replace with real RAG responses in production) ───
const DJ_PROFILE = {
  headline: "Business Development × AI/LLM × Full-Stack Engineering",
  tagline: "I build partnerships and products at the intersection of business strategy and technology.",
  stats: [
    { label: "Partnerships Closed", value: "12+", icon: "🤝" },
    { label: "AI Products Shipped", value: "4", icon: "🚀" },
    { label: "Revenue Influenced", value: "$3M+", icon: "📈" },
    { label: "Years in Tech", value: "8+", icon: "⚡" },
  ],
  sections: [
    {
      id: "bd",
      title: "Business Development",
      icon: "🤝",
      color: "#3B82F6",
      summary:
        "Built and closed strategic partnerships across gaming, fintech, and AI verticals. Led deal sourcing, negotiation, and post-deal integration for cross-border partnerships.",
      proofPoints: [
        {
          claim: "Led $2M+ partnership pipeline at Devs United Games",
          detail: "Sourced, negotiated, and closed partnerships with major game publishers across APAC. Built the BD function from zero.",
          company: "Devs United Games",
          period: "2021–2023",
          tags: ["partnerships", "gaming", "APAC"],
        },
        {
          claim: "Drove cross-border BD for AI-powered products",
          detail: "Managed relationships with enterprise clients for AI/ML product integrations. Developed partnership playbooks and frameworks.",
          company: "Multiple Ventures",
          period: "2019–2024",
          tags: ["AI", "enterprise", "strategy"],
        },
      ],
      chatStarter: "Tell me more about DJ's business development track record",
    },
    {
      id: "ai",
      title: "AI / LLMs",
      icon: "🧠",
      color: "#8B5CF6",
      summary:
        "Hands-on experience building LLM-powered applications, RAG systems, and AI product strategies. Bridges the gap between technical implementation and business value.",
      proofPoints: [
        {
          claim: "Built production RAG systems with Gemini + Pinecone",
          detail: "Designed and shipped a retrieval-augmented generation pipeline using gemini-embedding-001, Pinecone vector DB, and streaming inference with gemini-2.5-flash.",
          company: "Personal / Startup",
          period: "2024–Present",
          tags: ["RAG", "Gemini", "Pinecone", "LLM"],
        },
        {
          claim: "Developed AI product strategy for enterprise clients",
          detail: "Helped non-technical stakeholders understand and adopt LLM-based workflows. Translated complex ML concepts into business proposals.",
          company: "Consulting",
          period: "2023–2024",
          tags: ["product strategy", "AI adoption", "enterprise"],
        },
      ],
      chatStarter: "What AI and LLM projects has DJ built?",
    },
    {
      id: "leadership",
      title: "Leadership & Strategy",
      icon: "🎯",
      color: "#F59E0B",
      summary:
        "Led cross-functional teams at the intersection of product, engineering, and business. Comfortable operating in ambiguity and driving 0→1 initiatives.",
      proofPoints: [
        {
          claim: "Built and led BD team from zero at a gaming startup",
          detail: "Recruited, trained, and managed a team of 4 BD professionals. Established processes, KPIs, and reporting structures from scratch.",
          company: "Devs United Games",
          period: "2021–2023",
          tags: ["team building", "management", "0→1"],
        },
        {
          claim: "Drove product strategy across multiple verticals",
          detail: "Owned the product roadmap for partnership-driven products. Balanced technical feasibility with market opportunity and partner requirements.",
          company: "Multiple",
          period: "2020–2024",
          tags: ["product strategy", "roadmap", "cross-functional"],
        },
      ],
      chatStarter: "How has DJ demonstrated leadership?",
    },
    {
      id: "fullstack",
      title: "Full-Stack Engineering",
      icon: "💻",
      color: "#10B981",
      summary:
        "Proficient across the modern web stack — React, Next.js, Node.js, Python, cloud infrastructure. Builds what he strategizes, strategizes what he builds.",
      proofPoints: [
        {
          claim: "Shipped production apps with Next.js 16 + Vercel AI SDK",
          detail: "Built full-stack applications using Next.js App Router, Server Components, Vercel AI SDK v6, and Tailwind CSS 4. Comfortable with both frontend and backend.",
          company: "Personal / Startup",
          period: "2023–Present",
          tags: ["Next.js", "React", "Vercel", "TypeScript"],
        },
        {
          claim: "End-to-end engineering across web and mobile platforms",
          detail: "Delivered production features across React Native, Node.js APIs, and cloud deployments (AWS, Vercel). Strong DevOps and CI/CD practices.",
          company: "Multiple",
          period: "2018–2024",
          tags: ["full-stack", "React Native", "Node.js", "AWS"],
        },
      ],
      chatStarter: "What is DJ's technical stack?",
    },
  ],
};

const PERSONAS = [
  {
    id: "vc",
    label: "VC / Investor",
    labelKo: "VC / 투자자",
    icon: "💰",
    description: "Evaluating DJ as a founder or operator",
  },
  {
    id: "strategy",
    label: "Corporate Strategy",
    labelKo: "기업 전략",
    icon: "🏢",
    description: "Exploring potential collaboration or hire",
  },
  {
    id: "bd",
    label: "BD / Partnerships",
    labelKo: "사업개발 / 파트너십",
    icon: "🤝",
    description: "Looking for a partnership lead",
  },
  {
    id: "hiring",
    label: "Hiring Manager",
    labelKo: "채용 담당자",
    icon: "📋",
    description: "Evaluating for a specific role",
  },
];

const FOCUS_AREAS = [
  { id: "bd", label: "Business Development" },
  { id: "ai", label: "AI / LLMs" },
  { id: "leadership", label: "Leadership & Strategy" },
  { id: "fullstack", label: "Full-Stack Engineering" },
];

// ─── GATEWAY MODAL ───
function GatewayModal({ onComplete }) {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState(null);
  const [focus, setFocus] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-10 pb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
            DJ
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Ask DJ</h1>
          <p className="text-slate-400 text-sm">
            AI-powered knowledge base — ask anything about my experience
          </p>
        </div>

        <div className="p-8">
          {step === 0 ? (
            <>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                What best describes you?
              </h2>
              <div className="space-y-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPersona(p);
                      setStep(1);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
                      persona?.id === p.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <div className="font-medium text-slate-900">{p.label}</div>
                      <div className="text-xs text-slate-500">{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(0)}
                className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                What are you most interested in?
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {FOCUS_AREAS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFocus(f)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                      focus?.id === f.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => focus && onComplete({ persona, focus })}
                disabled={!focus}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl disabled:opacity-40 hover:shadow-lg transition-all duration-200"
              >
                Enter →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODE: BRIEF ───
function BriefMode({ visitorData, onAskAbout, profile }) {
  const [expanded, setExpanded] = useState(null);
  const focusSection = profile.sections.find((s) => s.id === visitorData.focus.id);
  const otherSections = profile.sections.filter((s) => s.id !== visitorData.focus.id);
  const ordered = focusSection ? [focusSection, ...otherSections] : profile.sections;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Personalized intro narrative */}
      <div className="mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-4">
          Tailored for {visitorData.persona.label} · Focus: {visitorData.focus.label}
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">{profile.headline}</h2>
        <p className="text-lg text-slate-600 leading-relaxed">{profile.tagline}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {profile.stats.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Expandable sections */}
      <div className="space-y-4">
        {ordered.map((section, idx) => {
          const isExpanded = expanded === section.id;
          const isPriority = idx === 0;

          return (
            <div
              key={section.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                isPriority
                  ? "border-blue-200 shadow-sm ring-1 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              {/* Section header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : section.id)}
                className="w-full text-left px-6 py-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: section.color + "15" }}
                  >
                    {section.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{section.title}</h3>
                      {isPriority && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          Your focus
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                      {section.summary}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-100">
                  <p className="text-sm text-slate-600 mt-4 mb-5 leading-relaxed">
                    {section.summary}
                  </p>

                  {/* Proof points */}
                  <div className="space-y-3">
                    {section.proofPoints.map((proof, pi) => (
                      <div
                        key={pi}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-100"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 text-sm">
                              {proof.claim}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {proof.company} · {proof.period}
                            </div>
                            <p className="text-sm text-slate-600 mt-2">
                              {proof.detail}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {proof.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drill-down CTA */}
                  <button
                    onClick={() => onAskAbout(section.chatStarter)}
                    className="mt-4 w-full py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Ask DJ about this →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODE: CHAT WITH EVIDENCE PANEL ───
function ChatMode({ visitorData, initialQuestion, profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [evidenceCards, setEvidenceCards] = useState([]);
  const [showEvidence, setShowEvidence] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial question from Brief mode
  useEffect(() => {
    if (initialQuestion) {
      simulateChat(initialQuestion);
    }
  }, []);

  const simulateChat = async (text) => {
    const history = messages.map(m=>({role:m.role,text:m.content}));
    const userMsg = { id: Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/ui-chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          query:text,
          personaId:visitorData?.persona?.id||'hiring',
          focusId:visitorData?.focus?.id||'fullstack',
          history,
        }),
      });
      const data = await res.json();
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response || "Sorry, something went wrong.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch(e) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      }]);
    }
    setIsTyping(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    simulateChat(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat panel */}
      <div className={`flex flex-col ${showEvidence ? "w-3/5" : "w-full"} transition-all duration-300`}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Chat with DJ's AI
              </h3>
              <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
                Ask anything about DJ's experience. Evidence and proof points will appear in the side panel.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {profile.sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => simulateChat(s.chatStarter)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    {s.icon} {s.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content.split("**").map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className={msg.role === "user" ? "text-white" : "text-slate-900"}>
                            {part}
                          </strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about DJ's experience..."
              className="flex-1 px-5 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-5 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Evidence panel */}
      {showEvidence && (
        <div className="w-2/5 border-l border-slate-200 bg-slate-50 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Evidence Trail</h3>
              <p className="text-xs text-slate-500">
                Proof points backing the conversation
              </p>
            </div>
            <button
              onClick={() => setShowEvidence(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {evidenceCards.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-3xl mb-3 opacity-50">📎</div>
              <p className="text-sm text-slate-500">
                Evidence cards will appear here as the conversation progresses
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {evidenceCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-sm text-slate-900 mb-2">
                    {card.claim}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                      {card.company}
                    </span>
                    <span>{card.period}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evidence toggle (when panel is hidden) */}
      {!showEvidence && evidenceCards.length > 0 && (
        <button
          onClick={() => setShowEvidence(true)}
          className="fixed right-4 bottom-24 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium z-10"
        >
          <span>📎</span>
          Evidence ({evidenceCards.length})
        </button>
      )}
    </div>
  );
}

// ─── MODE: FIT ANALYSIS ───
function FitMode({ visitorData, profile }) {
  const [needsInput, setNeedsInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const presets = {
    vc: "Looking for an operator who can bridge technical AI products with business development, ideally with experience in cross-border partnerships",
    strategy:
      "Need someone who can lead strategic initiatives involving AI/LLM adoption and build out BD functions from scratch",
    bd: "Seeking a partnerships lead with hands-on experience in tech, particularly AI/ML, who can close enterprise deals",
    hiring:
      "Hiring for a senior role combining business development with technical AI/product expertise",
  };

  const runAnalysis = (input) => {
    setIsAnalyzing(true);
    setAnalysis(null);

    setTimeout(() => {
      const fitResult = {
        overallScore: 87,
        verdict: "Strong Fit",
        narrative: `Based on your description, DJ's profile aligns strongly with what you're looking for. The combination of hands-on AI/LLM engineering (RAG systems, Gemini, Pinecone) with proven BD track record (12+ partnerships, $3M+ pipeline) is a rare profile in the market.`,
        dimensions: [
          {
            label: "Business Development",
            score: 92,
            notes: "Direct match — 12+ partnerships, pipeline ownership, cross-border experience",
          },
          {
            label: "AI / Technical Depth",
            score: 85,
            notes: "Strong — production RAG systems, LLM applications, but not ML research",
          },
          {
            label: "Leadership",
            score: 80,
            notes: "Built team from zero, cross-functional experience, 0→1 operator",
          },
          {
            label: "Strategic Thinking",
            score: 88,
            notes: "Bridges business and technical — rare combination at this level",
          },
        ],
        uniqueDiff:
          "Most candidates are either business-side or engineering-side. DJ operates natively in both — he doesn't just 'understand' AI, he builds production systems. He doesn't just 'understand' business, he's closed real partnerships.",
        gaps: "Limited experience in fundraising, public company experience, or managing teams larger than 10.",
      };
      setAnalysis(fitResult);
      setIsAnalyzing(false);
    }, 2500);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {!analysis ? (
        <>
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Fit Analysis
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Describe what you're looking for — a role, a partnership opportunity, an
              investment thesis — and I'll show you exactly how DJ's experience maps
              to your needs.
            </p>
          </div>

          {/* Preset suggestion */}
          <div className="mb-4">
            <button
              onClick={() => setNeedsInput(presets[visitorData.persona.id] || presets.hiring)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              💡 Use a suggested prompt for {visitorData.persona.label}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <textarea
              value={needsInput}
              onChange={(e) => setNeedsInput(e.target.value)}
              placeholder="e.g., Looking for a partnership lead with AI/LLM experience who can bridge technical products and enterprise sales..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={() => needsInput.trim() && runAnalysis(needsInput)}
              disabled={!needsInput.trim() || isAnalyzing}
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl disabled:opacity-40 hover:shadow-lg transition-all"
            >
              {isAnalyzing ? "Analyzing..." : "Run Fit Analysis →"}
            </button>
          </div>

          {isAnalyzing && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 bg-blue-50 text-blue-700 px-5 py-3 rounded-full text-sm font-medium">
                <svg
                  className="w-5 h-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing DJ's profile against your requirements...
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Results */}
          <button
            onClick={() => {
              setAnalysis(null);
              setNeedsInput("");
            }}
            className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
          >
            ← Run another analysis
          </button>

          {/* Score header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-6 text-center">
            <div className="text-6xl font-bold text-white mb-2">
              {analysis.overallScore}%
            </div>
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold">
              {analysis.verdict}
            </div>
            <p className="text-slate-400 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
              {analysis.narrative}
            </p>
          </div>

          {/* Dimension scores */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Dimension Breakdown</h3>
            <div className="space-y-4">
              {analysis.dimensions.map((dim, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      {dim.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {dim.score}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${dim.score}%`,
                        background:
                          dim.score >= 90
                            ? "linear-gradient(90deg, #10B981, #059669)"
                            : dim.score >= 80
                            ? "linear-gradient(90deg, #3B82F6, #2563EB)"
                            : "linear-gradient(90deg, #F59E0B, #D97706)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{dim.notes}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Differentiator + Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <h4 className="font-semibold text-emerald-900 text-sm mb-2 flex items-center gap-2">
                <span>✦</span> Unique Differentiator
              </h4>
              <p className="text-sm text-emerald-800 leading-relaxed">
                {analysis.uniqueDiff}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h4 className="font-semibold text-amber-900 text-sm mb-2 flex items-center gap-2">
                <span>⚠</span> Gaps to Consider
              </h4>
              <p className="text-sm text-amber-800 leading-relaxed">
                {analysis.gaps}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN APP ───
export default function AskDJ() {
  const [visitorData, setVisitorData] = useState(null);
  const [mode, setMode] = useState("brief");
  const [chatInitialQuestion, setChatInitialQuestion] = useState(null);

  const handleAskAbout = useCallback((question) => {
    setChatInitialQuestion(question);
    setMode("chat");
  }, []);

  const modes = [
    { id: "brief", label: "Brief", icon: "📄" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "fit", label: "Fit Analysis", icon: "🎯" },
  ];

  if (!visitorData) {
    return <GatewayModal onComplete={setVisitorData} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
            DJ
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Ask DJ</h1>
            <p className="text-xs text-slate-500">
              {visitorData.persona.icon} {visitorData.persona.label} · {visitorData.focus.label}
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id !== "chat") setChatInitialQuestion(null);
                setMode(m.id);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                mode === m.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="text-xs">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Settings */}
        <button
          onClick={() => setVisitorData(null)}
          className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 border border-slate-200 rounded-lg"
        >
          Change persona
        </button>
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {mode === "brief" && (
          <BriefMode
            visitorData={visitorData}
            onAskAbout={handleAskAbout}
            profile={DJ_PROFILE}
          />
        )}
        {mode === "chat" && (
          <ChatMode
            visitorData={visitorData}
            initialQuestion={chatInitialQuestion}
            profile={DJ_PROFILE}
          />
        )}
        {mode === "fit" && (
          <FitMode visitorData={visitorData} profile={DJ_PROFILE} />
        )}
      </div>
    </div>
  );
}