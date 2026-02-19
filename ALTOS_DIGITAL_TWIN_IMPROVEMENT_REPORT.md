# Altos VC Digital Twin Improvement Report

## 1. Objective
Build a RAG-based digital twin that represents DJ Lee as a top-tier Associate candidate for Altos Ventures by:
- Maximizing signal density and credibility.
- Matching Altos's tone: substance-first, low-hype, high-clarity.
- Making strengths and risks explicit, evidence-backed, and easy to audit.

This report expands the improvement plan into a detailed execution framework.

## 2. Current Baseline
### 2.1 Product baseline
- Recommended UI: `V11` (`ui_test/ask-dj-altos-final.html`).
- Supporting deep-dive UI: `V9` (`ui_test/ask-dj-ic-dashboard.html`).
- Existing production app (`app/page.tsx`) remains the RAG/chat engine foundation.

### 2.2 Strengths already in place
- Memo-first narrative format suitable for VC readers.
- Bilingual EN/KR capability in top prototype.
- Explicit risk section and mitigations.
- Inline AI thread interaction model.

### 2.3 Gaps to close
- Inconsistent evidence traceability for all high-impact claims.
- Need stricter retrieval behavior for partner-style questioning.
- Quick-scan discoverability can improve.
- Need formal validation process with measurable pass/fail criteria.

## 3. Target Outcome (Definition of Done)
The project is complete when:
1. A first-time Altos reviewer can understand candidate fit in under 3 minutes using quick-scan + memo intro.
2. A partner can stress-test claims in under 10 minutes via inline AI with source-grounded responses.
3. Every major claim (metrics, partnerships, fundraising, failures, role scope) is backed by retrievable evidence.
4. Hallucination rate for pre-defined evaluation questions is below threshold.
5. Tone remains professional, concise, and anti-hype across UI and generated answers.

## 4. Improvement Strategy
### 4.1 Positioning strategy
- Primary impression: investment memo, not chatbot.
- Secondary interaction: DD-style interrogation with citations.
- Framing: operator-to-investor transition with clear risk ownership.

### 4.2 Product strategy
- Ship one primary path (V11) instead of multiple competing front doors.
- Preserve V9 as optional advanced view for analytical reviewers.
- Use existing RAG backend, but tighten retrieval and evaluation discipline.

## 5. Workstreams

## 5.1 Workstream A: JD-to-Content Alignment
### Goal
Map every critical requirement from `altos_jd.md` to explicit, visible proof in the memo/UI.

### Key actions
- Build a requirement matrix with columns:
  - JD signal.
  - Current section/paragraph.
  - Evidence chunk ID.
  - Gap status.
  - Rewrite needed (Y/N).
- Close content gaps for:
  - A-player reputation evidence.
  - J-curve growth context.
  - Insightful questioning ability.
  - Insider trust network quality.
  - Team-player + self-driven examples.

### Deliverables
- `JD_SIGNAL_MAPPING.md` (new).
- Revised memo paragraphs in V11 source.

## 5.2 Workstream B: Evidence and Traceability
### Goal
Ensure every core claim is source-verifiable in both static memo and AI responses.

### Key actions
- Create a claim ledger covering:
  - Revenue impact.
  - Partnership outcomes.
  - Fundraising milestones.
  - Failure and post-mortem lessons.
  - Role scope and timeline.
- Enforce response policy:
  - No unsupported claim generation.
  - Prefer grounded answer + uncertainty when retrieval is weak.
- Validate citation linkage in inline AI threads.

### Deliverables
- `CLAIM_EVIDENCE_LEDGER.md` (new).
- Prompt/policy updates for grounded answering.

## 5.3 Workstream C: RAG Retrieval Quality
### Goal
Raise precision and consistency under partner-style interview questions.

### Key actions
- Tune retrieval for question categories:
  - Thesis quality.
  - Founder empathy.
  - Due diligence judgment.
  - Risk ownership.
  - Cross-border advantage.
- Improve follow-up query handling (context carryover for pronouns/ellipsis).
- Add high-value query set (20-30 questions) with expected evidence anchors.

### Deliverables
- `RAG_EVAL_SET_ALTOS.md` (new).
- Evaluation script output with pass/fail and error categorization.

## 5.4 Workstream D: UX for VC Decision Flow
### Goal
Optimize for fast skim, then deeper conviction-building.

### Key actions
- Keep memo-first reading path as default.
- Improve quick-scan discoverability (default-open on first load or onboarding cue).
- Preserve restrained motion and professional typography.
- Ensure mobile/desktop readability with no interaction dead-ends.

### Deliverables
- Updated `ui_test/ask-dj-altos-final.html`.
- Before/after UX notes and screenshots.

## 5.5 Workstream E: Validation and Review Ops
### Goal
Install repeatable quality gates before sharing externally.

### Key actions
- Conduct mock review sessions with 2-3 evaluators (recruiter + VC persona).
- Capture friction logs:
  - unclear claim,
  - weak evidence,
  - tonal mismatch,
  - navigation confusion.
- Run regression checks after each major content/prompt edit.

### Deliverables
- `MOCK_REVIEW_NOTES.md` (new).
- `RELEASE_CHECKLIST_ALTOS.md` (new).

## 6. Timeline (7-Day Execution)
### Day 1
- Freeze target architecture (V11 primary, V9 secondary).
- Build JD mapping skeleton and define quality thresholds.

### Day 2
- Complete JD-to-content gap closure drafts.
- Build claim-evidence ledger v1.

### Day 3
- Implement retrieval/prompt refinements for grounding.
- Assemble Altos-specific eval question set.

### Day 4
- Run first RAG evaluation cycle.
- Fix top retrieval/grounding failures.

### Day 5
- UX polish in V11 (quick-scan discovery, flow clarity, readability).
- Prepare 3 entry journeys: 90 sec / 5 min / 10 min.

### Day 6
- Conduct mock reviews and capture friction.
- Prioritize and ship critical fixes.

### Day 7
- Final regression pass.
- Package final share assets (link, one-pager PDF, backup view).

## 7. Success Metrics
### 7.1 Product metrics
- Time-to-first-conviction signal: <= 3 minutes.
- Completion of memo core sections: >= 70% in test sessions.
- Quick-scan engagement rate: >= 80% in mock sessions.

### 7.2 RAG quality metrics
- Grounded answer rate: >= 95% on eval set.
- Hallucination/unsupported claim rate: <= 5%.
- Correct evidence anchor retrieval: >= 90%.
- Follow-up question coherence score: >= 4/5 (manual rubric).

### 7.3 Narrative quality metrics
- Reviewer-rated tone match (Altos fit): >= 4/5.
- Reviewer-rated clarity of risk ownership: >= 4/5.
- Reviewer-rated credibility (signal vs hype): >= 4/5.

## 8. Risks and Mitigations
### Risk 1: Over-optimization to style over substance
- Mitigation: enforce claim ledger and grounded-answer policy before UI polish.

### Risk 2: Strong narrative but weak retrieval under pressure questions
- Mitigation: run partner-style eval set and fix by error class, not ad hoc.

### Risk 3: Too much information density for first-pass readers
- Mitigation: maintain progressive disclosure (quick-scan -> memo -> deep AI).

### Risk 4: Tone drift toward self-promotional language
- Mitigation: editorial pass with explicit anti-hype language checklist.

## 9. Governance and Change Control
- Single source of truth: this report + release checklist.
- Any change to core claims requires claim ledger update.
- Any retrieval/prompt change requires re-run of eval subset before merge.

## 10. Final Recommendation
- Use `V11` as the public/default interface.
- Use `V9` as optional deep diligence mode.
- Prioritize evidence integrity and retrieval quality over additional UI experimentation.

The improvement path should make the digital twin feel less like a candidate demo and more like a partner-ready investment memo with auditable intelligence.
