# Ask DJ — Prototype Evaluation Report (v3)
### Which UI best represents DJ Lee for the Altos Ventures Associate role?

---

## Changelog

- **v3 (Feb 2026):** Added V12 (Auditable Memo) — the evidence-first iteration built from `ALTOS_DIGITAL_TWIN_IMPROVEMENT_REPORT.md`. Re-evaluated rankings with 12 prototypes. V12 takes the top spot.
- **v2 (Feb 2026):** Re-evaluated against the 11 prototypes currently live in `/ui`. Added V1 (Original production app), V11 (Altos Final — the recommended merge). Removed 5 prototypes that were consolidated out of `/ui` during the curation pass (quiet, v3, merged-v1, preview, prototype.jsx). Updated rankings.
- **v1 (Feb 2026):** Initial evaluation of 14 raw prototype files in `/ui_test/`.

---

## Evaluation Framework

This report evaluates the 12 prototype interfaces available at `/ui` against five criteria derived from the Altos Ventures JD, the firm's culture, their website aesthetic, and the likely audience.

### Criteria

| # | Criterion | Weight | Rationale |
|---|-----------|--------|-----------|
| 1 | **Substance & Signal Density** | 25% | Altos values "본질에만 집중" (focus on essence). The JD repeatedly emphasizes substance over show — insightful questions, clear writing, no fluff. The UI must foreground real evidence, not decoration. |
| 2 | **Tone Match (Anti-Hype, Patient, Confident)** | 25% | Altos's identity is "value investing in VC" — contrarian, patient, anti-hype. Han Kim's "Foxes vs Hedgehogs" essay prizes focused persistence over flashy breadth. The prototype's tone must feel like something an Altos partner would actually open and read, not dismiss as marketing. |
| 3 | **Visual & Structural Alignment with Altos Aesthetic** | 20% | Altos's own website (designed by Fuzzco) is structured two-column, bold/minimal typography, monochrome with selective color, confident white space. The prototype should feel like it belongs in their visual ecosystem. |
| 4 | **Audience Fit (Elite VC Professionals)** | 15% | The readers are Han Kim, Ho Nam, Anthony Lee, Hee-Eun Park, Moon-Suk Oh — backgrounds spanning Stanford, West Point, McKinsey, Goldman Sachs. They are busy, analytically sharp, and allergic to gimmicks. The UI must respect their time and intelligence. |
| 5 | **DJ's Design Principle: "Content = Sincere, Design = Sleek"** | 15% | DJ's own stated philosophy. The prototype must balance honest, unembellished content with polished, intentional craft. Neither raw nor overproduced. |

### Scoring Scale

- **5** — Exceptional fit. Feels native to the Altos context.
- **4** — Strong fit. Minor adjustments needed.
- **3** — Decent. Some elements work, others clash.
- **2** — Weak fit. Significant misalignment.
- **1** — Poor fit. Wrong tone, audience, or approach entirely.

---

## The 12 Prototypes at a Glance

| Version | Name | File | Family |
|---------|------|------|--------|
| V1 | Original | Production app (`/`) | Chat-first |
| V2 | Full Suite | `ask-dj-v4.html` | Multi-mode |
| V3 | Narrative | `ask-dj-narrative.html` | Story |
| V4 | Signal Deck | `ask-dj-signal.html` | Signal/Data |
| V5 | Merged | `ask-dj-merged-v2.html` | Multi-mode |
| V6 | DD Data Room | `ask-dj-dd-room.html` | VC Memo |
| V7 | Hacker Terminal | `ask-dj-terminal.html` | Experimental |
| V8 | Living Memo | `ask-dj-memo.html` | VC Memo |
| V9 | IC Dashboard | `ask-dj-ic-dashboard.html` | VC Memo |
| V10 | Altos Memo Hub | `altos-memo-hub.html` | VC Memo |
| V11 | Altos Final | `ask-dj-altos-final.html` | VC Memo (Merged) |
| V12 | Auditable Memo | `ask-dj-v12-auditable.html` | VC Memo (Evidence-First) |

---

## Detailed Evaluations

### Tier 1 — Top Candidates

---

#### 1. V12 — Auditable Memo
**Score: 4.9 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 5 | Inherits all seven memo sections from V11, then layers on an evidence ledger of 12 source-verifiable claim anchors (`E1`–`E12`). Every quantitative claim — 55.47% revenue growth, ₩450M raised, TestDaF 5/5/4/5, enterprise deals — is tagged with a clickable purple superscript that opens a popover showing the exact claim, source document, and evidence type (metric, partnership, fundraising, technical, credential, etc.). JD signal tags on each section header explicitly map content to Altos's job requirements. This is the most auditable prototype — it answers the question "how do I know this is true?" before the reader asks it. |
| Tone Match | 5 | Same Source Serif 4 + Inter foundation as V11. The evidence markers are subtle — tiny purple superscripts that don't interrupt reading but invite verification. The reading path selector (90s / 5min / Full DD) is understated, embedded in the nav bar. No flashy animations. The overall tone is: "this was prepared by someone who expects their work to be checked." That is the JD's "자신의 결과물에 대해 엄격한 분" (someone rigorous about their own output) expressed through design. |
| Visual Alignment | 5 | Inherits V11's Altos-aligned aesthetic. The left-rail section nav adds a subtle structural element — progress dots that expand to show section names on scroll — without adding visual weight. Evidence popovers are clean white cards with type-coded badges. The reading path selector uses pill toggles that mirror Altos's own site navigation patterns. Nothing feels added for show. |
| Audience Fit | 5 | The three reading paths solve the "different partners, different time budgets" problem that V11's weakness section identified. A partner doing initial triage gets the 90-second scan (thesis + auto-opened sidebar). A partner building conviction gets the 5-minute memo. A partner doing due diligence gets the full read with AI threads and evidence anchors. The JD says "통찰력 있는 질문을 던지는 분" — V12 anticipates those questions by making every claim verifiable before the reader has to ask. |
| Content=Sincere, Design=Sleek | 5 | The evidence ledger is the ultimate sincerity move: "Here are 12 specific claims I make, and here is exactly where each one can be verified." Four risks instead of three (added "Limited portfolio company board experience" — LOW severity). The reading paths are honest about time: "you have 90 seconds, here's what matters." The design serves the evidence without decorating it. |

**Why it wins:** V12 is the implementation of the `ALTOS_DIGITAL_TWIN_IMPROVEMENT_REPORT.md` — a systematic upgrade that addresses every gap V11 left open. Where V11 was a synthesis of the best UI elements, V12 is a synthesis of the best *credibility* elements. The three specific advances:

| Enhancement | Source | What it solves |
|-------------|--------|----------------|
| Evidence Ledger (12 anchors) | Improvement Report §5.2 | Closes the "inconsistent evidence traceability" gap. Every high-impact claim is now source-verifiable. |
| Three Reading Paths (90s/5min/Full DD) | Improvement Report §5.4, §Day 5 | Delivers the "3 entry journeys" recommendation. Respects partner time budgets. |
| JD Signal Tags | Improvement Report §5.1 | Maps every memo section to specific Altos JD requirements. Shows the candidate did the homework. |

Additional improvements: left-rail section nav (v2 report recommendation #2), default-open quick-scan (v2 report recommendation #1), streaming AI threads (attempted SSE with fallback), 4th risk item, evidence IDs in the quick-scan sidebar.

**Remaining weakness:** The left-rail section nav is hidden on screens narrower than the memo column — not an issue on desktop but means mobile readers lose the navigation aid. The JD signal tags (small purple badges like "Distribution Strategy", "Founder Empathy") could risk feeling like the candidate is grading their own homework — though for Altos's analytical audience, explicit mapping is more likely appreciated than resented. The streaming AI thread attempts SSE from `/api/chat` which may not always parse cleanly, though the fallback to `/api/ui-chat` ensures reliability.

---

#### 2. V11 — Altos Final
**Score: 4.8 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 5 | Seven dense memo sections including the original six from V8 plus a new "Identified Risks & Growth Areas" section with severity badges and mitigants. Every paragraph is hoverable for AI deep-dives. The collapsible Quick-Scan sidebar gives skimmers instant access to 6 key facts without interrupting the reading flow. |
| Tone Match | 5 | Source Serif 4 headings + Inter body — more institutional and confident than Playfair Display. No flashy animations, no marketing language. The bilingual toggle is unobtrusive. The hover-to-ask-AI mechanic remains the subtlest AI integration of all prototypes. The overall feel: a document prepared by someone who writes like this professionally. |
| Visual Alignment | 5 | The typography upgrade (Source Serif 4) brings the aesthetic closer to Altos's Fuzzco-designed site. Generous whitespace, monochrome palette with selective green accents, confident margins. The Quick-Scan sidebar mirrors the two-column structure of Altos's own website. Print CSS included. |
| Audience Fit | 5 | Bilingual toggle (EN/KR) is a genuine structural advantage for a firm that operates daily between languages. The Quick-Scan sidebar respects the time of partners who want key facts before committing to the full read. The Risks section demonstrates the meta-cognition Altos explicitly values. Zero learning curve — it's a document. |
| Content=Sincere, Design=Sleek | 5 | The Risks section is the sincerity coup: "No direct VC experience" with a MEDIUM severity badge is exactly the kind of honest self-assessment that makes a reader trust everything else. The design is refined without being decorative. Source Serif 4 reads as institutional gravitas, not magazine editorial. |

**Why it's still strong:** V11 remains the cleanest, most focused expression of the memo format. For readers who value simplicity and don't need the evidence layer, V11 is arguably the better experience — fewer moving parts, zero learning curve, pure writing. V12 surpasses it for analytical readers who want to verify claims, but V11's restraint is its own kind of strength.

**Weakness vs V12:** No evidence traceability. No progressive reading paths. Quick-Scan sidebar is closed by default (easy to miss). Three risks instead of four.

---

#### 3. V8 — Living Memo
**Score: 4.6 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 5 | Six dense sections ("The Thesis", "Operator Profile", "The Failure", "Cross-Cultural Edge", "Investment Conviction", "Why Altos") read like an actual IC memo. The writing itself is the product. |
| Tone Match | 5 | Playfair Display serif + Inter body = literate, confident, unhurried. No flashy animations. The hover-to-ask-AI mechanic adds depth without demanding attention. |
| Visual Alignment | 4 | Clean, structured, good typography hierarchy. Slightly more "editorial magazine" than Altos's own site. Playfair Display is elegant but not institutional. |
| Audience Fit | 5 | VCs read memos all day. This speaks their native language. Zero learning curve. |
| Content=Sincere, Design=Sleek | 5 | The "Failure" section is genuinely vulnerable. The "Why Altos" section shows specific firm knowledge. The design serves the writing. |

**Why it's still strong:** The original winner. V11 and V12 surpass it by addressing specific weaknesses (no bilingual, no quick-scan, no evidence anchors), but V8 remains the purest expression of "the writing is the proof."

**Weakness:** English-only. No progressive disclosure for skimmers. No explicit risk acknowledgment. No evidence traceability.

---

#### 4. V9 — IC Dashboard
**Score: 4.3 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 5 | Tabbed structure (Investment Thesis → Traction & Metrics → Identified Risks → Cap Table/Skills) maps directly to IC evaluation workflows. The risk section with severity badges is a masterstroke of self-awareness. |
| Tone Match | 4 | Professional, structured, data-forward. The "IC Debate Thread" chat panel is clever. Slightly more "SaaS dashboard" than "VC firm" in feel. |
| Visual Alignment | 4 | Clean Tailwind grids, good hierarchy. The 60/40 split echoes Altos's two-column structure. Color palette could be warmer. |
| Audience Fit | 5 | Literally speaks their workflow. "Deal Pipeline / 2026 Q1 Hires / Project DJL" — the framing fits their mental model. |
| Content=Sincere, Design=Sleek | 4 | Risk section is admirably honest. Dashboard chrome is sleek but perhaps slightly over-designed. |

**Why it works:** Speaks the audience's daily workflow language. The risk section alone elevates this above most prototypes.

**Weakness:** "Project DJL" positioning could feel presumptuous. The Tailwind aesthetic is "tech startup" not "established VC firm."

---

#### 5. V10 — Altos Memo Hub
**Score: 4.1 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 5 | Nine full pages: career timeline, case studies, competency matrices, writing samples, network references, founder Q&A, and operating principles. Most comprehensive prototype. Bilingual (KR/EN). |
| Tone Match | 4 | Inter + JetBrains Mono, monochrome palette, sidebar navigation — institutional and serious. Depth demonstrates thoroughness. But 9-page scope might feel heavy. |
| Visual Alignment | 4 | Sidebar navigation mirrors internal tools. Dark/light theme toggle and print CSS show attention to detail. |
| Audience Fit | 4 | Comprehensive but possibly *too* comprehensive for initial review. Volume could overwhelm. |
| Content=Sincere, Design=Sleek | 4 | Thorough and specific content. Polished design. Exhaustive scope slightly tips toward "trying too hard." |

**Why it works:** Bilingual toggle is a genuine differentiator. Depth mirrors Altos's "Self-Driven & High Standard" value.

**Weakness:** Length. Nine pages risks being the VC equivalent of a 30-slide deck when 10 would do. RAG not connected.

---

### Tier 2 — Strong but Imperfect

---

#### 6. V4 — Signal Deck
**Score: 3.6 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 4 | "Signal chips" (double-take facts), rarity lines, Venn diagram of BD × AI/ML × Startup Founder. The "Recruiter Quick-Scan" with 6 pre-answered questions is genuinely useful. |
| Tone Match | 3 | The "rarity" framing is inherently self-promotional. "Most BD candidates can't..." clashes with Altos's humility values. Scroll-snap feels like a product landing page. |
| Visual Alignment | 3 | Modern web design, but *marketing* web design. Altos's site is structured but not scroll-jacked. |
| Audience Fit | 3 | Quick-Scan respects time. But scroll-snap forces a linear sales pitch. VCs can smell pitches. |
| Content=Sincere, Design=Sleek | 3 | Strong content, but the framing undermines sincerity. "I'm rare" is the opposite of quiet confidence. |

**Salvageable element:** The Quick-Scan concept was extracted into V11/V12's collapsible sidebar, where it works much better without the self-promotional wrapper.

---

#### 7. V6 — DD Data Room
**Score: 3.5 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 4 | Left-pane memo + right-pane RAG chat. Good density. DD room metaphor is appropriate. Citation cross-refs between chat and memo sections are a nice technical touch. |
| Tone Match | 3 | Split-pane feels more legal tech than personal introduction. "Due Diligence" framing is clinical — positions candidate as something to be investigated, not someone to be met. |
| Visual Alignment | 3 | Functional but not aesthetically distinctive. Pragmatic rather than crafted. |
| Audience Fit | 4 | VCs understand DD rooms. Legible metaphor. But better as a *second* interaction, not a first impression. |
| Content=Sincere, Design=Sleek | 3 | Content is direct. Design is utilitarian. Tips toward "functional demo." |

---

#### 8. V3 — Narrative
**Score: 3.4 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 4 | Four story paths, timeline chapters with year markers, "aside" cards. Rich content with multiple entry points. |
| Tone Match | 2 | Gateway modal (persona selection → focus selection → enter) is from product demos and games, not professional contexts. Sequential chapter reveal with typing indicators feels like chatbot onboarding. |
| Visual Alignment | 3 | Timeline/chapter structure is clean. But gateway modal, persona cards, and typing reveals are the wrong design vocabulary. |
| Audience Fit | 2 | Persona gateway is the critical failure. Asking a senior VC to self-identify as "Hiring Manager" before viewing content creates friction and feels presumptuous. |
| Content=Sincere, Design=Sleek | 3 | Story content is compelling. Interactive wrapper (choose-your-adventure) feels like a product, not a person. |

**Salvageable element:** The timeline chapter format (year range → headline → body → aside card) is excellent. Stripped of the gateway, it could elevate a simpler design.

---

#### 9. V1 — Original (Production App)
**Score: 3.3 / 5.0**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Substance & Signal | 4 | Full streaming RAG pipeline with persona-aware re-ranking, focus-filtered retrieval, entity detection, and conversation memory. The most technically sophisticated implementation. Content depth depends entirely on what the user asks — it's a blank canvas with a powerful engine behind it. |
| Tone Match | 3 | Gateway modal asks visitors to self-identify (persona + focus area) before chatting. Streaming chat is functional and responsive. But the "Chat with My Resume" framing is generic — it doesn't signal VC context. The tone is "job applicant tool" not "investor-grade presentation." |
| Visual Alignment | 3 | Clean chat interface with suggested questions, language toggle, markdown rendering. Competent Tailwind design. But it looks like every other AI chatbot — no distinctive visual identity. Nothing signals "this was made for Altos." |
| Audience Fit | 3 | A busy VC partner will see a chat window and have to figure out what to ask. The gateway modal (persona selection) adds friction. The suggested questions help, but the format still requires the reader to pull content out rather than having it presented. This is an exploration tool, not a presentation. |
| Content=Sincere, Design=Sleek | 3 | The RAG pipeline is technically impressive, and the responses are genuinely grounded in resume data. But the chat format hides the writing quality behind an interaction pattern. The design is competent but unremarkable. |

**Why it matters:** V1 is the engineering foundation — the RAG pipeline, persona system, and analytics infrastructure that powers all other prototypes' AI features. As a standalone presentation for Altos, it's the wrong format. As the backend that makes V8/V9/V11/V12's AI threads work, it's essential.

**Weakness:** Chat-first format puts the burden on the reader. No writing showcase. Generic visual identity. Gateway modal is friction.

---

### Tier 3 — Significant Misalignment

---

#### 10. V2 — Full Suite
**Score: 3.1 / 5.0**

Multi-panel layout with education, skills, and experience sections plus three modes (Brief overview, Chat with evidence panel, Fit Analysis). Comprehensive but feels like a resume builder output. The design is competent but generic — it could be anyone's portfolio. For Altos, where the JD explicitly asks for people who stand out ("그 회사의 에이스"), generic is the worst sin.

#### 11. V5 — Merged
**Score: 2.9 / 5.0**

Multi-mode with deep-dive and quick-scan options, topic accordions, floating orbs. Mode selection is user-considerate but spreads content thin. The deep-dive isn't as deep as V8's memo, and the quick-scan isn't as efficient as V9's dashboard. For Altos, which prizes "본질에만 집중" (focus on essence), trying to be everything signals the opposite.

#### 12. V7 — Hacker Terminal
**Score: 2.4 / 5.0**

Boot sequence, command-line interface, green-on-black CRT aesthetic with scanlines. Tab autocomplete, command history, ASCII art header. The most polarizing prototype. For a technical audience (YC, engineering-focused VCs), it might charm. For Altos — whose communication style is "thoughtful, philosophical, founder-focused" and whose website is Fuzzco-designed minimalism — a CLI interface reads as performative nerdiness. The JD asks for "말과 글로 명확하고 쉽게 전달하는 분" (clear, easy communication). A terminal is definitionally not easy for non-technical users.

---

## Final Ranking

| Rank | Version | Name | Score | One-Line Verdict |
|------|---------|------|-------|-----------------|
| 1 | **V12** | **Auditable Memo** | **4.9** | Evidence-first memo — 12 claim anchors, 3 reading paths, JD signal mapping. The "자신의 결과물에 대해 엄격한" prototype. |
| 2 | V11 | Altos Final | 4.8 | The cleanest memo — bilingual, risks, quick-scan, Source Serif 4. Best for readers who value simplicity. |
| 3 | V8 | Living Memo | 4.6 | The writing *is* the proof. Purest expression, but lacks bilingual, evidence, and quick-scan. |
| 4 | V9 | IC Dashboard | 4.3 | Speaks their workflow language. Risk section is a masterstroke. Slightly "SaaS." |
| 5 | V10 | Altos Memo Hub | 4.1 | Most comprehensive. Bilingual is a differentiator. Needs tighter curation. No RAG. |
| 6 | V4 | Signal Deck | 3.6 | Strong content, wrong wrapper. "I'm rare" framing clashes with Altos humility. |
| 7 | V6 | DD Data Room | 3.5 | Legible metaphor, too clinical. Better as a second interaction. |
| 8 | V3 | Narrative | 3.4 | Great content structure, bad gateway. Persona selection is a dealbreaker. |
| 9 | V1 | Original | 3.3 | Powerful RAG engine, wrong presentation format. Backend, not frontend. |
| 10 | V2 | Full Suite | 3.1 | Competent but generic. Could be anyone. |
| 11 | V5 | Merged | 2.9 | Tries everything, masters nothing. |
| 12 | V7 | Hacker Terminal | 2.4 | Charming for hackers, alienating for Altos. |

---

## Recommendation

### Primary: V12 — Auditable Memo

V12 is the credibility layer on top of V11's synthesis. It was built from the `ALTOS_DIGITAL_TWIN_IMPROVEMENT_REPORT.md`, which identified three critical gaps in V11: inconsistent evidence traceability, no progressive reading paths, and no JD-to-content alignment mapping. V12 closes all three:

| Enhancement | Source | JD Signal |
|-------------|--------|-----------|
| Evidence Ledger (12 anchors with source popovers) | Improvement Report §5.2 | "자신의 결과물에 대해 엄격한 분" — rigor about one's own output |
| Three Reading Paths (90s / 5min / Full DD) | Improvement Report §5.4 | "본질에만 집중" — let the reader choose their depth, don't force a single path |
| JD Signal Tags on each section | Improvement Report §5.1 | "통찰력 있는 질문" — shows the candidate analyzed the JD, not just read it |
| Left-rail section progress nav | v2 Report recommendation #2 | Structural navigation for long-scroll readers |
| Default-open Quick-Scan | v2 Report recommendation #1 | First-time readers see key facts immediately |
| 4th risk item (board experience) | Improvement Report §5.5 | "메타인지" — deeper self-assessment |

The 0.1 delta between V12 (4.9) and V11 (4.8) is intentionally narrow. V12 is objectively more thorough, but the improvement report's own Risk #3 warned: "Too much information density for first-pass readers." V12 manages this through progressive disclosure (reading paths), but the additional UI elements (evidence popovers, section nav, reading path selector, JD tags) do add cognitive surface area. For a reader who just wants to read a memo, V11 is still excellent.

### When to use which

| Reader Profile | Best Version | Why |
|---------------|--------------|-----|
| **Han Kim / Ho Nam** (founders, philosophical, time-constrained) | V12 in 90s scan or V11 | Start with 90s scan to hook, then the writing earns the rest. V11 if they prefer zero UI chrome. |
| **Anthony Lee** (analytical, Stanford/Goldman background) | V12 in Full DD mode | Evidence anchors match an analyst's verification instinct. JD signal tags show structured thinking. |
| **Moon-Suk Oh / operating team** (process-oriented) | V9 (IC Dashboard) | Tabbed deal review format maps to their daily workflow. |
| **Hee-Eun Park** (HR/talent, detail-oriented) | V12 in 5min memo mode or V10 | V12's evidence layer helps HR verify claims. V10's 9-page depth serves thorough evaluators. |
| **Technical co-evaluation** | V1 (Original) as backend demo | Show the RAG architecture: Pinecone, Gemini, streaming, persona-aware re-ranking. |

### Evolution lineage

```
V8 (Living Memo, 4.6)
 └─ + bilingual (V10) + risks (V9) + quick-scan (V4) + Source Serif 4
    = V11 (Altos Final, 4.8)
       └─ + evidence ledger + reading paths + JD signals + section nav
          = V12 (Auditable Memo, 4.9)
```

Each generation solves the previous generation's documented weaknesses without introducing new friction. The improvement path has been systematic: UI synthesis (V11) → credibility layer (V12).

---

*Evaluation updated February 2026. Based on analysis of the Altos Ventures JD, the firm's team/culture/portfolio/aesthetic, and direct review of all 12 prototypes currently available in `/ui`.*
