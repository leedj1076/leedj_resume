# V12 Auditable Memo — Improvement Plan & Design Spec

## 1. Executive Summary

V12 is the top-ranked prototype (4.9/5.0). This document specifies six improvements to close the remaining gap — designed by three models (Claude, Gemini, Codex), synthesized into final content and UI specifications ready for implementation.

**Guiding Principle: Increase signal, not ceremony.** The goal is a document that feels like an internal partner's advocacy, not a candidate's performance.

**Anti-Goals:** This plan defers all aesthetic/UI enhancements, mobile optimization, and additional reading paths. The sole focus is signal density and auditability.

---

## 2. Strategic Framework

1. **Pre-empt Diligence.** Answer a partner's next three questions before they are asked. `JD Coverage Matrix` + `Bull/Bear Synthesis` front-load the critical information.

2. **Show the Work, Not Just the Answer.** The `Founder Question Framework` demonstrates *how* the candidate thinks, not just *that* he can.

3. **Translate Potential into a Plan.** The `90-Day Operating Plan` converts abstract capabilities into concrete, time-bound deliverables.

---

## 3. Success Criteria

1. 3/3 reviewers map all JD requirements within 30 seconds using the matrix
2. Bull/Bear section rated "balanced" by at least 2/3 reviewers
3. 5/5 founder questions are experience-grounded with explicit decision consequences
4. 90-Day plan has measurable 30/60/90 outputs and at least one failure trigger per phase
5. Every evidence popover includes verification date, method, confidence, and invalidation condition
6. AI responses either cite `[E#]` or explicitly state insufficient evidence

---

## 4. Design Specifications

---

### 4.1 JD Coverage Matrix

**Placement:** Between title block and first memo section. Visible on all reading paths.

**UI Layout:**
- Full-width card, max-height one viewport fold, no internal scroll
- Columns: `JD Signal | Section | Evidence IDs | Strength`
- KR-first labels, EN subtitle in muted text
- Row hover → jump link to relevant section
- Evidence ID click → existing popover
- Gap row: light amber background (`#fefce8`) to draw attention

**Content:**

| JD Signal | Memo Section | Evidence | Strength |
|:---|:---|:---|:---|
| 통찰력 있는 질문 / Insightful Questioning | Founder Question Framework | [E11] [E10] [E6] | ●●●●○ |
| 폭발적 성장 경험 / J-Curve Growth | The Thesis, Operator Profile | [E1] [E2] [E3] [E10] | ●●●●● |
| 실행력 + 빠른 속도 / Execution Speed | Operator Profile, 90-Day Plan | [E1] [E2] [E3] [E6] | ●●●●● |
| 명확한 커뮤니케이션 / Clear Communication | Full Memo, Bull/Bear, AI Threads | [E9] [E11] | ●●●●○ |
| 메타인지 + 실패 인정 / Metacognition | Bull/Bear Synthesis, Risks | [E10] [E11] | ●●●●○ |
| 높은 기준 / High Standards & Rigor | Evidence Ledger, Verification | [E1]–[E12] | ●●●●● |
| 팀 내 건설적 긴장감 / Constructive Conviction | Bull/Bear, Founder Questions | [E10] [E11] [E6] | ●●●●○ |
| 인사이더 신뢰 / Insider Trust Networks | Cross-Cultural Edge | [E2] [E3] [E6] | ●●●○○ |
| **Gap** | **Direct VC investing track record** | | |

**Gap Mitigation (EN):** No closed-loop VC investing track record (sourcing → IC → outcome). Mitigated by: 90-Day Plan targeting 15 founder meetings shadowed, 3 IC-prep memos drafted, and sourcing-to-review conversion rate tracked transparently.

**Gap Mitigation (KR):** VC 투자 실적의 폐쇄루프(소싱→IC→성과) 직접 증명 부재. 완화: 90일 계획에서 파운더 미팅 15건 동행, IC 메모 초안 3건 제출, 소싱→리뷰 전환률 투명 공개로 대응.

---

### 4.2 Founder Question Framework

**Placement:** New section between "Why Altos" and "Risks." Collapsible accordion — expanded in Full DD, collapsed teaser in 5min, hidden in 90s.

**UI Layout:**
- Accordion cards with indigo left-border callout on decision consequence
- Per card: `Question → Why I Ask → Strong Signal → Weak Signal → Decision Consequence`
- Bilingual: KR primary, EN one-line header gloss

---

#### Q1: Growth Durability

**EN:** "Does your revenue growth survive if you remove channel incentives? Which metric breaks first after two quarters without them?"

**KR:** "채널 인센티브를 제거해도 매출 성장이 유지됩니까? 제거 후 2분기 뒤 어떤 지표가 먼저 무너집니까?"

**Why I ask:** At Devs United, I analyzed how Meta Quest+ channel policy changes would impact actual profitability [E11]. I learned to look at growth durability before growth rate.

**Strong signal:** Immediately quantifies channel-dependent revenue share, presents alternative acquisition plans, shows price/margin elasticity data.

**Weak signal:** "Our partner will keep supporting us" — qualitative answer only, no sensitivity analysis.

**Decision consequence:** Weak answer → move to `invest hold`, do not proceed until partner dependency risk is independently verified.

---

#### Q2: Advantage Decomposition

**EN:** "Is your competitive advantage product-driven, execution-driven, or timing-driven? What's your survival strategy if each one disappears?"

**KR:** "당신이 이기고 있는 이유가 제품 우위입니까, 실행 우위입니까, 타이밍 우위입니까? 각각 사라질 때 생존 전략은?"

**Why I ask:** As COO/Co-founder at Flint [E10], I experienced both growth and failure firsthand — and learned that misjudging your winning factor is fatal.

**Strong signal:** Provides per-factor metrics, articulates pivot plans for each scenario, names the execution owner for each contingency.

**Weak signal:** All advantages collapse into abstractions like "brand" or "team capability."

**Decision consequence:** Weak answer → downgrade the thesis itself before discussing valuation.

---

#### Q3: Enterprise Adoption Gap

**EN:** "What assumption breaks most often between 'contract signed' and 'actual usage' in your enterprise deals? How did you fix it in the last two quarters?"

**KR:** "엔터프라이즈 계약의 '서명'과 '실사용' 사이에서 가장 자주 깨지는 가정은 무엇이고, 지난 2분기에서 어떻게 수정했습니까?"

**Why I ask:** Closing enterprise deals at TmaxSoft with Samsung, Hyundai, KT, and POSCO [E6] taught me repeatedly that contract signing and actual adoption are completely different problems.

**Strong signal:** Cites PoC-to-deployment conversion rates, explains champion churn response, presents specific onboarding friction improvements.

**Weak signal:** Treats logo acquisition as proof of PMF.

**Decision consequence:** Weak answer → defer investment decision until 3 reference customer interviews are completed.

---

#### Q4: Technical Moat Half-Life

**EN:** "If your core model or data pipeline becomes a commodity within 12 months, where does your competitive advantage remain?"

**KR:** "핵심 모델/데이터 파이프라인이 12개월 안에 commodity가 되면, 경쟁우위는 어디에 남습니까?"

**Why I ask:** Building a GNN recommendation engine [E5] and operating a production RAG pipeline [E9] taught me that technical advantage half-life is short. The question is what remains when the tech is table stakes.

**Strong signal:** Points to non-model defensibility — proprietary data rights, distribution network lock-in, workflow integration depth.

**Weak signal:** "We'll keep improving the model" — single-vector answer.

**Decision consequence:** Weak answer → apply technology risk premium to terms, or pass.

---

#### Q5: Existential Risk Kill-Switch

**EN:** "What single risk has the highest probability of killing your company in the next 18 months, and what kill-switch are you already executing?"

**KR:** "향후 18개월에 회사를 죽일 확률이 가장 높은 단일 리스크는 무엇이고, 이미 실행 중인 kill-switch는 무엇입니까?"

**Why I ask:** Running operations during growth at Flint [E10] and analyzing revenue risks at Devs United [E11] showed me the difference between teams that *recognize* risk and teams that have *operationalized* risk management.

**Strong signal:** Clear single-risk prioritization, early-warning metrics already defined, response owner already assigned.

**Weak signal:** Lists multiple risks without triggers or assigned accountability.

**Decision consequence:** Weak answer → flag `execution fragility` as the primary counter-argument in the IC memo.

---

### 4.3 Bull/Bear Synthesis

**Placement:** New section between "Why Altos" and "Risks." Visible on 5min Memo and Full DD paths.

**UI Layout:**
- Two-column grid on desktop (bull left, bear right), stacking on mobile
- Bull: light green left-border (`#16a34a`)
- Bear: light amber left-border (`#f59e0b`)
- Current Assessment: full-width, indigo background card (`#eef2ff`)
- All text uses `Source Serif 4`, evidence tags use existing `EvidencedText` component

---

#### Bull Case / 강점 시나리오

**EN:**
DJ shows operator-grade execution with measurable growth and enterprise traction: 55.47% YoY revenue growth[E1] and multiple tier-1 enterprise outcomes[E6] indicate repeatable commercial discipline. He has worked through platform-scale partnerships (Meta Quest+[E2], Apple Vision Pro[E3]), demonstrating the ability to evaluate strategic dependency rather than just top-line narratives[E11]. His COO/co-founder track record[E10] plus 7+ years of execution experience[E12] supports immediate contribution in founder assessment and memo production. Technical fluency (GNN[E5], RAG[E9]) adds edge in AI-native diligence where many candidates remain surface-level.

**KR:**
DJ는 수치로 검증된 실행형 운영자입니다. 55.47% YoY 성장[E1]과 대기업 레퍼런스[E6]는 우연이 아닌 반복 가능한 실행력을 보여줍니다. Meta Quest+[E2], Apple Vision Pro[E3] 파트너십 경험은 플랫폼 의존성과 협상 리스크를 실제로 다뤄본 신호입니다[E11]. COO/공동창업자 경험[E10]과 7년+ 경력[E12]은 초반부터 딜 검토와 메모 작성에 즉시 기여할 가능성을 높입니다. GNN[E5]/RAG[E9] 실무 이해는 AI 딜 실사에서 표면적 판단을 넘는 차별점입니다.

---

#### Bear Case / 반대 시나리오

**EN:**
There is no direct proof of closed-loop VC investing performance (sourcing → IC → outcome) in the evidence set. Founder-network depth is inferred from partnerships and enterprise access[E2][E3][E6], but repeatable "first-call from top founders" evidence is not yet explicit. Financial modeling depth for fund-grade underwriting is a potential gap versus peers with prior investing seats. The profile is strong operator-to-investor potential, but conversion risk remains unless early IC work quality is verified quickly.

**KR:**
현재 증거셋에는 VC 투자 실적의 폐쇄루프(소싱→IC→성과) 직접 증명이 없습니다. 창업자 네트워크의 '깊은 신뢰'는 파트너십/엔터프라이즈 접근으로 추정되지만[E2][E3][E6], 최상위 창업자의 반복적 first-call 증거는 아직 약합니다. 펀드 수준 언더라이팅 관점에서 재무모델링 깊이는 투자 경력자 대비 공백일 수 있습니다. 매우 강한 전환 잠재력은 있으나 초기 투자 산출물 검증이 필수입니다.

---

#### Current Assessment / 현재 판단

**EN:**
Recommend "advance with conviction, verify fast." The bear case risks are coachable and procedural; the bull case strengths are foundational and hard to teach. The core hypothesis: operator DNA enables faster credibility-building with founders than a traditional finance-background associate. This assessment would be invalidated by: weak IC memo rigor across 3+ live opportunities, or inability to build trusted founder pipelines in the first quarter.

**KR:**
"확신을 갖고 전진하되, 빠르게 검증"이 적절합니다. 약세론의 리스크는 코칭 가능하고 절차적인 반면, 강세론의 강점은 근본적이고 가르치기 어렵습니다. 핵심 가설: 운영자 DNA가 전통적 금융 배경 심사역보다 창업자와의 신뢰 구축을 더 빠르게 할 것. 이 판단이 무효화되는 조건: 3건 이상의 실전 기회에서 IC 메모 rigor가 낮거나 첫 분기 내 founder pull이 형성되지 않을 경우.

---

### 4.4 90-Day Operating Plan

**Placement:** New section after "Why Altos." Visible on 5min Memo and Full DD paths. Collapsible.

**UI Layout:**
- 3-column timeline cards (0–30, 31–60, 61–90)
- Each card: `Phase Title` → `Deliverables (numbered)` → `Failure Trigger` → `Self-Correction`
- Deliverables have metrics chips (e.g., `15 meetings`, `2 memos`)
- Failure trigger section: dashed top-border, amber warning icon
- Tone: operational, not aspirational

---

#### Days 0–30: Learn & Align

**Deliverables:**
1. Altos thesis map v1.0 — per-sector `what we believe / what we avoid / proof needed` one-pagers (6 sectors)
2. Shadow partner/team founder meetings: 15 meetings attended, 15 meeting memos submitted within 24 hours
3. Portfolio value-creation briefs for 5 existing companies (1 page each, 3 action items per company)

**Failure Trigger:** Memo on-time submission rate <90% within 30 days.
**Self-Correction:** Simplify memo template + establish two fixed daily writing blocks + pre-agree reviewer SLA.

---

#### Days 31–60: Contribute & Source

**Deliverables:**
1. Independent sourcing pipeline: 40 companies logged, 10 pass partner-fit filter
2. Lead 12 founder first-meetings independently, convert 4 to deep-dive stage
3. Draft 2 IC-prep memos (market/team/risk/counter-thesis sections), complete partner feedback round

**Failure Trigger:** Sourced → partner-review conversion rate <20%.
**Self-Correction:** Redefine sourcing filter (5-question checklist), weekly rejection-pattern review with team lead.

---

#### Days 61–90: Lead Independently in Process

**Deliverables:**
1. Own a diligence workstream on 1 active deal (customer calls, reference calls, risk memo)
2. Submit 1 IC memo as first-draft owner, including explicit counter-thesis section
3. Execute 2 portfolio support projects (hiring/BD/partnership), deliver results report

**Failure Trigger:** 2 consecutive diligence milestone delays, or repeated judgment reversals.
**Self-Correction:** Reduce scope to 3 core questions per workstream, increase partner checkpoint cadence to 2x/week.

---

### 4.5 Evidence Verification Upgrade

**Changes to EVIDENCE data structure:** Add `verified`, `method`, `confidence`, `invalidation` fields to each entry.

**Upgraded Popover Layout:**
- Row 1: Claim + Source type (existing)
- Row 2: `Verified: YYYY-MM` | `Method: ...`
- Row 3: `Confidence: High/Medium/Low` + one-line justification (color-coded: High=#16a34a, Medium=#f59e0b, Low=#ef4444)
- Row 4: `Invalidation:` condition text (amber color)
- Max 5 short lines; truncate with "more" expansion if needed

**Confidence Rubric:**
- **High** = Direct artifact exists and is externally verifiable
- **Medium** = Implementation proven but impact attribution is partial or assumption-sensitive
- **Low** = Self-reported with no independent verification

---

| ID | Verified | Method | Confidence | Invalidation |
|:---|:---|:---|:---|:---|
| E1 | 2026-02 | FY revenue ledger + monthly P&L reconciliation | **High** — direct financial records | Accounting basis change or one-time revenue reclassification alters YoY calculation |
| E2 | 2026-02 | Signed partnership agreement + launch documentation | **High** — executed contract artifact | Contract limited to non-exclusive pilot/short-term test, "global distribution" is overstated |
| E3 | 2026-02 | Apple collaboration records + public launch references | **High** — partner artifact + public trace | Role was listing/support level, not launch partner integration |
| E4 | 2026-02 | Bank receipts + cap table + board consent docs | **High** — fund flow + governance docs | Convertible terms/bridge inclusion brings actual raised amount below ₩450M |
| E5 | 2026-02 | Repo commit history + architecture docs + experiment logs | **Medium** — artifact exists, impact attribution partial | System was POC-only without production deployment, or performance gains not reproducible |
| E6 | 2026-02 | Executed MSAs/SOWs + invoice records + stakeholder confirmation | **High** — contract + commercial evidence | Deals were unpaid PoCs or single-event engagements, not production contracts |
| E7 | 2026-02 | Official TestDaF score report verification | **High** — credential document | Certificate validity expired or identity mismatch discovered |
| E8 | 2026-02 | Degree certificates + transcript checks (KAIST, KIT) | **High** — official academic documents | Degree/honors designation error or equivalency interpretation incorrect |
| E9 | 2026-02 | System design doc + deployment config + query logs | **Medium** — implementation proven, production criticality varies | System operates only in internal demo environment, not production workloads |
| E10 | 2026-02 | Corporate registration + role description + org records | **High** — formal role artifact | Title exists but actual responsibility scope is materially narrower than described |
| E11 | 2026-02 | Analysis memo version history + model assumptions sheet | **Medium** — analysis exists, assumption-sensitive | Core assumptions (channel fees, conversion rates) diverge from actuals, invalidating conclusions |
| E12 | 2026-02 | Employment timeline cross-check (contracts + HR records) | **High** — documented chronology | Career gaps or overlapping tenure calculation changes the 7+ years basis |

---

### 4.6 AI Citation Enforcement

**Phase 1 (immediate):** Add the following to the system prompt sent via `/api/chat` when `sectionId` context comes from V12.

**Phase 2 (conditional):** Parse AI responses for `[E#]` markers and render them using existing `EvidencedText` component. Ship only after citation accuracy is validated on 10+ test questions.

---

#### System Prompt Addition

```
You are the memo assistant for DJ Lee's Auditable Memo.
Your primary goal is epistemic reliability, not fluency.

Rules:
1. When stating a factual claim supported by the evidence ledger, append citation markers: [E1], [E2], etc.
2. If a sentence depends on multiple evidence items, cite all relevant markers (e.g., [E2][E11]).
3. If evidence is missing, weak, or indirect, say: "Insufficient evidence in the memo to answer this."
4. You may add a cautious hypothesis only if clearly labeled "Inference:" and followed by what evidence would validate it.
5. Never invent evidence IDs, numbers, partnerships, dates, or outcomes.
6. Prefer short, decision-useful answers: claim → evidence → implication.
7. If asked for certainty beyond evidence quality, use calibrated language: High confidence / Medium confidence / Low confidence, with reason.
8. Match the user's language (Korean or English). Keep [E#] markers unchanged in both languages.

Citation policy:
- Verified claims: must cite [E#].
- Mixed verified + inferred: cite [E#] and label inferred part as "Inference:".
- Unsupported: return the insufficient-evidence phrase and suggest what specific evidence is needed.

Korean reliability clause:
- 근거가 있는 사실 진술에는 반드시 [E#]를 붙이세요.
- 근거가 부족하면: "이 질문에 답변하기에는 메모에 증거가 불충분합니다."
- 추론은 "Inference:"로 분리하고 검증에 필요한 추가 증거를 명시하세요.

Evidence Ledger:
E1: 55.47% YoY revenue increase — Devs United Games internal revenue report, FY2024 vs FY2023
E2: Meta Quest+ global distribution partnership — Platform agreement with Meta, H1 2024
E3: Apple Vision Pro launch partnership — Apple developer partnership & visionOS launch title agreement
E4: ₩450M pre-seed funding raised — Flint Technologies cap table, investment agreements 2020–2021
E5: GNN recommendation engine built — Flint Technologies technical architecture docs, deployed system
E6: Enterprise deals with Samsung, Hyundai, KT, POSCO — Contract records, TmaxSoft 2018–2020
E7: TestDaF 5/5/4/5 German proficiency — TestDaF certificate, KIT enrollment
E8: KAIST + KIT dual M.S. degree, Cum Laude — University transcripts and degree certificates
E9: RAG pipeline with Pinecone + Gemini — This application, live production system
E10: COO & Co-founder role at Flint — Corporate registration, founding team documentation
E11: Revenue cannibalization analysis for Meta Quest+ — Internal analysis deck, Devs United
E12: 7+ years professional experience — LinkedIn profile, verified employment history 2018–present
```

---

## 5. Implementation Priority

| Priority | Improvement | Sprint | What Ships |
|:---|:---|:---|:---|
| P1 | JD Coverage Matrix | 1 | Static matrix component + gap row |
| P2 | Bull/Bear Synthesis | 1 | EN/KR content + two-column layout |
| P3 | Founder Question Framework | 2 | 5 accordion cards with bilingual content |
| P4 | 90-Day Operating Plan | 2 | 3-phase timeline cards |
| P5 | Evidence Verification Upgrade | 3 | Updated EVIDENCE data + popover redesign |
| P6 | AI Citation Enforcement | 3 | Phase 1 system prompt only |

**Dependencies:** P1–P4 are independent. P5 requires EVIDENCE data structure update. P6 Phase 1 is independent; Phase 2 benefits from P5.

---

## 6. Execution Risks

| Risk | Severity | Mitigation |
|:---|:---|:---|
| Over-instrumentation | MEDIUM | All new sections collapsible. 5min path shows only Matrix + Bull/Bear + existing content. |
| Bear case too strong | LOW | Bear case frames growth areas, not fatal flaws. Assessment lands on conviction. |
| Founder questions feel generic | MEDIUM | Every question traces to specific experience (Flint, TmaxSoft, Meta/Apple). "Why I ask" is the proof. |
| AI citation creates false precision | LOW | Phase 1 only (prompt engineering). Validate accuracy before enabling rendered citation links. |

---

*Report generated 2026-02-14. Three-model synthesis: Claude Opus 4.6, Gemini, Codex (GPT-5.3).*
*Source: `ui_test/ask-dj-v12-auditable.html` (965 lines). Target: `altos_jd.md`.*
