# Ask DJ Codebase Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Ask DJ into a clear, tested application while preserving its routes, presentation, authored content, and local-only material.

**Architecture:** Keep Next.js as the application boundary. Extract shared domain contracts, pure RAG/knowledge operations, server-only service adapters, and focused React controllers. Pin verified defects with regression tests before moving their code.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, AI SDK 6, OpenAI, Pinecone, Supabase, Zod, Vitest, React Testing Library, Playwright.

**Spec:** [Approved design](../specs/2026-09-29-codebase-refactor-design.md), approved after documentation commit `762e644`. Application baseline: `12f13a2`.

## Global Constraints

- Keep Next.js App Router, React, TypeScript, the AI SDK, Pinecone, and Supabase.
- Preserve `/dj`, all four work-sample pages, `/v1`, `/ui`, the prototype routes, and the admin workflows.
- Preserve public streaming and prototype JSON response formats, valid persona aliases, authored text, bilingual selection, dark mode, source labels, and conversation export.
- Keep retrieval weights, thresholds, and prompt intent unless a verified correctness defect requires a documented change.
- Personal Meta preparation remains local-only and ignored.
- Preserve existing local-consumer import paths through compatibility exports when moving profile/settings code.
- Do not introduce a dependency-injection framework, generic repository superclass, event bus, or new backend service.
- No live re-index, production database migration, model evaluation against paid services, deployment, or modification of personal untracked files is part of implementation verification.
- Use an isolated `codex/` branch/worktree for implementation. Keep personal files in their existing checkout.
- CI runs offline checks and a deterministic build without production credentials.

## Review Focus

1. Browser storage disabled or retaining obsolete raw passwords: public chat remains usable; admin login works without retaining secrets. Tests: Tasks 3 and 10.
2. Valid responses arriving after reset or after a newer filter: stale work cannot restore cleared messages or overwrite current results. Tests: Tasks 9–11.
3. Ambiguous legacy transcripts and untagged vectors: reject uncertain speaker attribution and preserve uncertain ownership. Tests: Tasks 6–7.
4. A vector write succeeds but acknowledgement fails: retries use stable IDs and do not announce unverified success. Tests: Task 5.
5. Long Korean content, custom labels, and incomplete streams: controls stay reachable and exports remain complete/readable. Tests: Tasks 10, 12, 14.

## File ownership and task cycle

This is one coordinated plan because the subsystems share identity, message, knowledge, and provider contracts. Tasks are independently reviewable; execute in order. Never assign overlapping route/controller edits concurrently.

| Area | Responsibility |
| --- | --- |
| `lib/domain/` | Shared persona, language, knowledge, admin-data contracts |
| `lib/chat/` | Message parsing, transcripts, browser exports |
| `lib/rag/` | Pure search plans, metadata normalization, selection, context, prompts |
| `lib/server/` | Configuration, auth, admission, providers, repositories, orchestration |
| `hooks/` | Conversation and admin request lifecycles |
| `components/{profile,chat,admin,work-samples}/` | Focused presentation and interactions |
| `database/` | Versioned schema and adoption notes |
| `tests/{unit,server,components,e2e}/` | Offline behavioral contracts and browser smoke tests |

For every task: run its new tests and record a meaningful failure, implement, rerun to pass, review the diff, then commit only explicit paths. Use imperative English commit messages. Keep mechanical formatting separate. No global lint-rule suppression to hide defects.

Before execution, inspect attached worktrees and reuse/create a managed worktree from the documentation HEAD. Record the original Meta file hashes in temporary storage. Install dependencies in the worktree; do not symlink them or copy `.env.local`. Tests use isolated fake configuration and reject unmocked provider traffic.

## Task 1: Domain contracts and offline test foundation

**Files:** Create `vitest.config.ts`, `tests/setup.ts`, `lib/domain/{personas,language,knowledge}.ts`, `lib/chat/messages.ts`, `tests/unit/domain.test.ts`. Modify `package.json`, `package-lock.json`, `lib/{types,visitor-data,persona-config,profile-data}.ts`.

**Interfaces:** Produce `Persona`, `Focus`, `VisitorData`, `PersonaLabel`, `PersonaOption`; `resolveVisitor(raw: unknown): VisitorData`; `resolvePersonaOptions(visible: readonly string[] | undefined, labels: unknown): PersonaOption[]`; `Language = 'en' | 'kr'`; `toApiLanguage(lang: Language): 'en' | 'ko'`; `KnowledgeEntrySchema`/`KnowledgeEntry`; `getMessageText(message: ChatUIMessage): string`; `parseFollowUps(text: string): { clean: string; followUps: string[] }`. Preserve exports from current paths.

- [ ] Add Vitest/jsdom/Testing Library/jest-dom dev dependencies and direct Zod dependency. Add `test` (`vitest run`) and `typecheck` (`tsc --noEmit`) scripts, aliases, and a test-only `server-only` shim.
- [ ] Write inherited-key, alias, label, language, corpus, and follow-up tests:
  ```ts
  expect(resolveVisitor({ persona: 'constructor', focus: 'full_stack' }))
    .toEqual({ persona: 'vc', focus: 'full_stack' });
  expect(resolveVisitor({ persona: 'founder', focus: 'ai_llms' }).persona)
    .toBe('founder_partner');
  ```
  Cover `__proto__`, `toString`, nulls/arrays, every current prototype alias, empty visibility, blank labels, complete/incomplete follow-up tags, and both actual JSON files without changed or duplicate IDs.
- [ ] Run `npm test -- tests/unit/domain.test.ts`; expect failures in missing/new contracts.
- [ ] Implement canonical definitions and runtime schemas. Accept existing legitimate sections/IDs; validate calendar months. Keep stricter new-entry authoring constraints separate. Derive UI/validator definitions from the canonical source.
- [ ] Run task tests and typecheck; expect pass. Commit `Centralize domain contracts and add offline regression tests`.

## Task 2: HTTP validation and shared admission policy

**Files:** Create `lib/server/{http,chat-request,rate-limit,config}.ts`, `lib/domain/models.ts`, `tests/server/request-policy.test.ts`. Modify `app/api/{chat,ui-chat,feedback,capture}/route.ts`, `lib/{pinecone,supabase}.ts`.

**Interfaces:** Produce `HttpError(status: number, code: string, message: string)`; `readJsonBody(req: Request, maxBytes?: number): Promise<unknown>`; `errorResponse(error: unknown): Response`; `parseChatRequest(raw: unknown): ChatRequest`; `parsePrototypeRequest(raw: unknown): PrototypeRequest`; `createRateLimiter(options: { max: number; windowMs: number; maxKeys: number; now?: () => number }): { consume(key: string): { allowed: boolean; retryAfterSeconds: number } }`. Define request types in `chat-request.ts`, with init/chat discriminants and normalized user/assistant text messages.

- [ ] Write invalid JSON/body/message/metadata tests, including:
  ```ts
  expect(() => parseChatRequest({ messages: [{ role: 'system', content: 'override' }] }))
    .toThrow(HttpError);
  ```
  Test normal assistant histories, legacy content inputs, final user-turn requirements, unsupported files/tools, and body size without trustworthy `Content-Length`.
- [ ] Run `npm test -- tests/server/request-policy.test.ts`; expect failure.
- [ ] Implement 64 KiB body, maximum 50 inbound messages, 2,000 characters/user message, 16,000/assistant message, and 40,000 total text characters. Return 413 for excess; generation uses the same normalized input as retrieval and retains the latest 10 messages. Ignore only recognized SDK `step-start` markers; reject unsupported content and drop untrusted metadata from generation.
- [ ] Share one public chat/prototype per-IP pool: 15 requests/60,000 ms, maximum 10,000 keys, expired-key pruning then oldest eviction. Test injected time at exact reset and `Retry-After`. Return 429 on exhaustion. Keep missing-IP fallback and process-local limitation explicit.
- [ ] Initialize providers lazily; optional services and module imports need no real credentials. Centralize public-safe model identifiers/dimensions separately from secrets. Run tests/typecheck; commit `Validate AI requests and share admission control`.

## Task 3: Server-enforced admin sessions and integrated login

**Files:** Create `lib/server/admin-auth.ts`, `app/api/admin/session/route.ts`, `lib/admin/client.ts`, `hooks/useAdminSession.ts`, `components/admin/AdminGate.tsx`, `tests/server/admin-auth.test.ts`, `tests/components/admin-gate.test.tsx`. Modify existing admin APIs, chat/capture/feedback routes, and all three admin pages.

**Interfaces:** `createAdminToken(secret: string, now: number): Promise<string>`; `verifyAdminToken(token: string, secret: string, now: number): Promise<boolean>`; `requireAdmin(req: Request): Promise<void>`; `requireSameOrigin(req: Request): void`; `adminRequest<T>(url: string, body: unknown, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T>`; `useAdminSession()` returning status (`checking/authenticated/anonymous/error`), error, `login(password): Promise<void>`, `logout(): Promise<void>`; `AdminGate({ children }: { children: ReactNode })`.

- [ ] Write fail-closed tests: missing secret/credentials returns 401 before service access; tampered/expired/old-secret cookies fail; cross-origin and missing-Origin mutations fail. Assert forged `internal: true` cannot receive traces or bypass tracking. Component tests distinguish 401, 500, network failure, and valid login without an AI call.
  ```ts
  const token = await createAdminToken('test-secret', 1_000);
  expect(await verifyAdminToken(token, 'test-secret', 1_000 + 28_800_000)).toBe(false);
  expect(await verifyAdminToken(token, 'rotated-secret', 1_000)).toBe(false);
  ```
- [ ] Run `npm test -- tests/server/admin-auth.test.ts tests/components/admin-gate.test.tsx`; expect failure.
- [ ] Implement versioned HMAC-SHA256 signed sessions, strict decoding, constant-time comparisons, eight-hour expiry. Cookie `ask_dj_admin`: HttpOnly, SameSite=Strict, Path=/, Secure in production, Max-Age=28,800. GET checks session; POST authenticates; DELETE clears it. Mutation Origin must match the request URL origin. Add a separate five-attempt/minute login limiter.
- [ ] Migrate all admin consumers together: cookie credentials, shared gate, no password bodies/storage, clear old `admin_password`/`capture_password` defensively. Storage exceptions do not prevent login/logout. Session validity is independent of database availability. Authorize internal chat/capture/feedback on server; authorized internal work skips alerts and tracking consistently.
- [ ] Run tests/typecheck; commit the cohesive server/client authentication migration.

## Task 4: Versioned persistence, reliable settings, and events

**Files:** Create `database/001_initial.sql`, `database/README.md`, `lib/domain/admin.ts`, `lib/server/{database,settings,exchanges,events}.ts`, `tests/server/persistence.test.ts`. Modify `lib/{supabase,settings,analytics,email}.ts`, admin settings/exchanges/stats routes.

**Interfaces:** Export schemas/types for `Exchange`, `Session`, `Stats`, `AppSettings`, `SettingsPatch`, `ExchangeQuery`, `ExchangePage`, `SessionPage`. `AppSettings` has `mode`, `visiblePersonas`, `personaLabels`; `SettingsPatch` is a partial of that shape. `ExchangeQuery` has positive integer `page`, optional persona, and the current `all/unreviewed/reviewed/good/needs_improvement` filter; `readSettings(): Promise<AppSettings>`; `saveSettings(patch: SettingsPatch): Promise<AppSettings>`; `listExchanges(query): Promise<ExchangePage>`; `listSessions(query): Promise<SessionPage>`; `getStats(now?: Date): Promise<Stats>`. Retain old settings exports and response field names.

- [ ] Test rejected writes never return saved state; unavailable optional storage yields public defaults but writes return 503; fresh reads observe changed answer modes. A 2,501-row fixture must yield complete counts/grouping across repository pages. Cover empty results, duplicate timestamps, invalid filters/pages, and exact batch boundaries.
  With the test's database adapter configured to reject the write:
  ```ts
  await expect(saveSettings({ mode: 'pyramid' })).rejects.toThrow();
  ```
- [ ] Run `npm test -- tests/server/persistence.test.ts`; expect failure.
- [ ] Version the three tables and actual fields, integer-compatible exchange IDs, timestamps, indexes, and service-role-only access (RLS, no public policies). Document clean initialization versus inspected existing-schema adoption. Do not execute against live services.
- [ ] Check every Supabase result, validate rows, remove indefinite answer-mode caching. Fetch rows in ordered batches of 500 with stable `(created_at, id)` ordering before complete central aggregation; retain 10-session/20-exchange UI page sizes.
- [ ] Type analytics/exchange payloads, preserve `waitUntil`, and avoid unnecessary sensitive logs. Use plain-text email and optional `RESEND_FROM`/`RESEND_TO`; incomplete alert configuration disables alerts with a diagnostic, never chat. Test literal hostile HTML, internal alert exclusion, and notification rejection isolation. Run tests/typecheck; commit persistence and notification units separately.

## Task 5: Recoverable correction synchronization

**Files:** Create `database/002_correction_sync.sql`, `lib/server/corrections.ts`, `tests/server/corrections.test.ts`. Modify `lib/domain/admin.ts`, `lib/server/exchanges.ts`, `app/api/admin/review/route.ts`, `database/README.md`.

**Interfaces:** Produce `ReviewInput = { exchangeId: number; rating: 'good' | 'needs_improvement'; comment?: string; improvementText?: string }`; `saveReview(input: ReviewInput): Promise<ReviewResult>`. `ReviewResult` contains existing success/chunk fields plus `correctionStatus: 'none' | 'pending' | 'applied' | 'failed'`. Tests substitute database/vector boundaries, not orchestration.

- [ ] Write tests for invalid/missing exchanges, invalid rating, embedding/upsert failures, acknowledgement loss, and retry. Repeated exchange-42 submissions upsert only `dj-correction-42`; failed indexing cannot report `applied`.
  Assert the route/service result and captured vector writes from the test adapters:
  ```ts
  expect(failedResult.correctionStatus).toBe('failed');
  expect(new Set(writtenVectors.map(record => record.id))).toEqual(new Set(['dj-correction-42']));
  ```
- [ ] Run `npm test -- tests/server/corrections.test.ts`; expect failure.
- [ ] Add additive synchronization state/error fields. Persist review and pending intent before indexing; mark applied only after acknowledgement. Record failures and keep the correction text retryable. A rating-only update does not erase a previous correction.
- [ ] Return explicit partial-failure information/status, validate before side effects, and keep operations idempotent through the stable ID. Run tests/typecheck; commit `Track correction synchronization and support safe retries`.

## Task 6: Truthful capture-to-knowledge processing

**Files:** Create `lib/chat/transcript.ts`, `lib/server/knowledge-structuring.ts`, `tests/unit/transcript.test.ts`, `tests/server/knowledge-structuring.test.ts`. Modify `app/admin/capture/page.tsx`, `scripts/structure.ts`, `lib/domain/knowledge.ts`.

**Interfaces:** `Transcript = { version: 1; turns: { speaker: 'interviewer' | 'subject'; text: string }[] }`; `serializeTranscript(transcript: Transcript, format: 'json' | 'text'): string`; `parseTranscript(raw: string, format: 'auto' | 'capture-legacy' | 'qa'): Transcript`; `toInterviewExchanges(transcript: Transcript): { question: string; answer: string }[]`; `structureKnowledge(exchanges: readonly InterviewExchange[]): Promise<KnowledgeEntry[]>`, with `InterviewExchange` exported from the transcript module. CLI owns disk writes/provider setup.

- [ ] Write capture-export/parser round-trip tests:
  ```ts
  const source: Transcript = { version: 1, turns: [
    { speaker: 'interviewer', text: 'What did you build?' },
    { speaker: 'subject', text: 'I built the retrieval system.' },
  ] };
  expect(toInterviewExchanges(parseTranscript(serializeTranscript(source, 'text'), 'auto')))
    .toEqual([{ question: 'What did you build?', answer: 'I built the retrieval system.' }]);
  ```
  Cover multiline Korean, incomplete final questions, consecutive subject turns, capture JSON arrays, Q/A text, and ambiguous Human/Assistant text that must require explicit mode.
- [ ] Run `npm test -- tests/unit/transcript.test.ts tests/server/knowledge-structuring.test.ts`; expect failure.
- [ ] Export explicit role labels/versioned JSON. Legacy capture mode maps Assistant to interviewer and Human/User to subject. Add `--format capture-legacy` and `--format qa`. Unknown/ambiguous formats produce diagnostics before generation/writes; no silent whole-document fallback.
- [ ] Validate generated records and unique IDs across existing/new entries. Append only after validation using a same-directory temporary file and atomic rename. Tests assert provider/parse/write failures leave original JSON unchanged. Run tests/typecheck; commit `Make transcript attribution explicit and validate generated knowledge`.

## Task 7: Non-destructive ingestion

**Files:** Create `lib/rag/knowledge-metadata.ts`, `lib/server/ingestion.ts`, `tests/unit/ingestion-plan.test.ts`, `tests/server/ingestion.test.ts`. Modify `scripts/ingest.ts`; document operational behavior in `docs/architecture.md` (create ingestion section now).

**Interfaces:** `buildEnrichedText(entry: KnowledgeEntry): string`; `buildKnowledgeMetadata(entry: KnowledgeEntry): KnowledgeMetadata`; `ExistingVector = { id: string; sourceOwner?: string }`; `planIngestion(entries: readonly KnowledgeEntry[], existing: readonly ExistingVector[]): IngestionPlan`; `syncKnowledge(entries: readonly KnowledgeEntry[], options: { dryRun: boolean }): Promise<IngestionReport>`. Define plan/report in `ingestion.ts`; plan contains `createIds`, `updateIds`, `deleteIds`, `preservedIds`. Owner marker: `source_owner: 'ask-dj:json:v1'`.

- [ ] Write ownership/partial-failure tests:
  ```ts
  expect(planIngestion([], [{ id: 'dj-correction-42' }, { id: 'legacy-unknown' }]).deleteIds)
    .toEqual([]);
  ```
  The side-effecting service rejects an empty source set. Cover duplicates, bad schema, incomplete inventory, 101-record batches, failed second upload, and safe rerun. No pruning follows failed validation, inventory, embeddings, or upload.
- [ ] Run `npm test -- tests/unit/ingestion-plan.test.ts tests/server/ingestion.test.ts`; expect failure.
- [ ] Inventory all vector IDs with paginated listing and batched metadata fetch; form a complete plan before writes. Reject source IDs in the reserved `dj-correction-` prefix before provider access. `--dry-run` can read the configured index but never embeds, creates, upserts, or deletes; tests inject inventory and assert zero mutations. Normal execution upserts batches of 100 before pruning only explicitly owned stale IDs. Remove `deleteAll`.
- [ ] Preserve corrections and untagged legacy vectors; document separate reviewed legacy cleanup. Metadata marks ongoing only for experience entries with a known start and null end. Preserve namespace `resume`, dimension 3072, index creation options, stable IDs, and enrichment intent. Run tests/typecheck; commit `Synchronize owned knowledge without deleting corrections`. Do not execute live ingestion/dry-run.

## Task 8: Typed, pure RAG policy and evidence context

**Files:** Create `lib/rag/{types,metadata,retrieval-plan,selection,context,prompts,labels}.ts`, `tests/unit/rag.test.ts`. Modify `lib/entity-detection.ts` while retaining exports.

**Interfaces:** `ChunkRecord` retains existing ID/text/depth/section/skills/core/score/question fields. `normalizeChunk(id: string, metadata: unknown, score: number): ChunkRecord | null` validates provider records once. `RewriteResult = { query: string; intent: 'specific' | 'broad' | 'ambiguous'; clarifications: string[] }`; `parseRewrite(raw: string, fallbackQuery: string): RewriteResult`; `buildRetrievalPlan(input: { query: string; visitor: VisitorData; intent: RewriteResult['intent'] }): RetrievalPlan`; `selectEvidence(chunks: readonly ChunkRecord[], rawMatches: readonly ChunkRecord[], visitor: VisitorData, intent: RewriteResult['intent']): EvidenceSelection`; `assembleContext(selection: EvidenceSelection): ContextResult`; `buildSystemPrompt(input: PromptInput): string`; `getSourceTags(chunks: readonly ChunkRecord[]): string[]`. All shared RAG shapes live in `types.ts`; `ContextResult` contains text, usedChunks, primaryChunkId.

- [ ] Create deterministic fixtures covering every retrieval branch, suppressed/pinned records, ties, direct matches outside the top 15, and malformed metadata/rewrite. Direct context contains primary plus at most five supplements; sources and used IDs match that exact context. Suppression applies before both direct-match and general selection.
  ```ts
  expect(parseRewrite('{"query":42}', 'original question').query).toBe('original question');
  expect(context.usedChunks.map(chunk => chunk.id)).toEqual(expectedPromptIds);
  ```
  `context` and `expectedPromptIds` come from the explicit primary-plus-supplementary fixture above.
- [ ] Run `npm test -- tests/unit/rag.test.ts`; expect failure.
- [ ] Extract current policy with named constants: top 15; direct threshold 0.72 and gap 0.03, or score 0.85; persona dampening at most 1.0; source cap 3. Preserve existing ranking multiplication/tie order; do not silently add semantic-score multiplication.
- [ ] Correct temporal overlap: ended records overlap requested year; ongoing experience requires positive known start no later than year-end. Support existing experience metadata with end=0 as legacy ongoing, excluding summary/undated records. Test before/after start and exact year boundaries. Run tests/typecheck; commit `Extract tested retrieval selection and evidence context`.

## Task 9: Thin routes and one testable AI orchestration layer

**Files:** Create `lib/server/{rag-service,chat-service,capture-service,providers}.ts`, `lib/rag/trace.ts`, `tests/server/{chat-service,chat-routes}.test.ts`. Modify chat/prototype/capture routes, `scripts/eval.ts`, `components/TracePanel.tsx`, `lib/types.ts`.

**Interfaces:** Consume Tasks 1–8. Produce `prepareAnswer(request: Extract<ChatRequest, { type: 'chat' }>, signal: AbortSignal): Promise<PreparedAnswer>`; `PreparedAnswer` contains `messages`, `context: ContextResult`, `prompt`, and `trace`. Preparation includes rewrite/embedding/retrieval/selection but never answer generation, so the evaluator can call it directly; `handleChat(request: ChatRequest, options: { signal: AbortSignal; internal: boolean }): Promise<Response>`; `handlePrototypeChat(request: PrototypeRequest, signal: AbortSignal): Promise<{ response: string; chunksUsed: string[] }>`; `handleCapture(messages: ChatUIMessage[], signal: AbortSignal): Promise<Response>`. Export discriminated trace payloads. Provider adapter exposes named rewrite/embed/search/fetch/generate operations with supported cancellation.

- [ ] Write fake-provider tests: ambiguity does no vector search; unchanged rewrites reuse an embedding and still perform original-question matching; rewrite failure retains that path; abort stops later stages; cancelled completions do not log finished exchanges. Verify init welcome, public stream metadata, and prototype JSON compatibility.
  In the ambiguous-request fixture, assert `expect(search).not.toHaveBeenCalled()`; in the unchanged-rewrite fixture, assert `expect(embed).toHaveBeenCalledTimes(1)` and that original-question search still runs. These are boundary spies around the real service.
- [ ] Run `npm test -- tests/server/chat-service.test.ts tests/server/chat-routes.test.ts`; expect failure.
- [ ] Wire extracted policy and named provider results, replacing positional unknown-array casts. Propagate cancellation through supported stages and check between calls. Persist actual context IDs; public streams omit diagnostic prompts. Preserve `waitUntil` and existing output-token/model policies.
- [ ] Keep prototype nonstreaming response and established prompt policy while sharing primitives and guards. Use the retrieval-only `prepareAnswer` path in `scripts/eval.ts` and correct current-role expectations. Derive trace UI labels from actual payloads.
- [ ] Test actual route exports for 400/401/413/429/500 and successful SDK streams, with fake boundary services. Run tests/typecheck; commit extraction and integration as reviewable units.

## Task 10: Reliable profile and conversation lifecycles

**Files:** Create `hooks/{useProfileConversation,useTheme,useAutoScroll}.ts`, `components/profile/{ProfileNavigation,PersonaSelector}.tsx`, `components/chat/{ChatComposer,ChatMessage,FollowUpSuggestions}.tsx`, `tests/components/{conversation,persona-selector}.test.tsx`. Modify `components/{ProfileApp,ProfileAppLoader,ChatPanel,FeedbackButtons,V14WelcomeModal}.tsx`, `app/v1/page.tsx`.

**Interfaces:** Export `ProfileAppProps` with existing optional props; `useProfileConversation(options: ProfileAppProps & { lang: Language; persona: Persona })` returning messages/status/error/selected trace and `send(text)`, `stop()`, `reset()`, `selectTrace(id: string | null)`, `submitFeedback(id: string, value: 'up' | 'down'): Promise<void>`. `ChatComposer` takes value/onChange/onSend/onStop/disabled/streaming/lang. Keep current component entry points for local-only imports.

- [ ] Write delayed-stream/reset tests: abort and clear history/errors/trace; late chunks never resurrect messages. Delayed legacy welcome cannot overwrite user messages, reset, or newer initialization. Non-2xx welcome uses the static fallback; ordinary retry still works.
- [ ] Test identical mobile/desktop/welcome persona values and custom labels, including hidden defaults and Korean. Composition Enter must send zero times; normal Enter once; Shift+Enter inserts newline; empty/loading input sends zero times. Test failed feedback remains retryable and throwing storage APIs do not break public chat.
  After dispatching composition Enter, assert `expect(onSend).not.toHaveBeenCalled()`; after ordinary Enter, assert `expect(onSend).toHaveBeenCalledTimes(1)`. After reset and delayed stream completion, assert `expect(result.current.messages).toEqual([])`.
- [ ] Run `npm test -- tests/components/conversation.test.tsx tests/components/persona-selector.test.tsx`; expect failure.
- [ ] Implement stable transport/controller state without render-time ref reads. Reset invalidates request generations. Normalize outgoing parts, share persona resolution, synchronize document language, and make storage defensive. Feedback checks HTTP success before disabling permanently.
- [ ] Extract presentation while retaining styles. Add accessible input/selection/status semantics, viewport-contained welcome dialog, and completed-answer announcements. Follow streaming scroll only near the bottom. Run tests/typecheck and targeted lint; commit lifecycle and presentation units.

## Task 11: Focused, race-safe admin features

**Files:** Create `hooks/{useAdminSessions,useAdminSettings,useAdminStats}.ts`, `components/admin/{AdminDashboard,ReviewTab,ReviewEditor,AnalyticsTab,SettingsTab,CaptureInterview}.tsx`, `tests/components/admin-dashboard.test.tsx`. Modify the three admin pages and use Task 3's client/gate.

**Interfaces:** `useAdminSessions(query: ExchangeQuery)` returns typed data/loading/error/refresh; `useAdminSettings()` returns saved settings/save/loading/error; `useAdminStats()` returns `Stats | null`/loading/error/refresh. `ReviewEditor` owns a selected exchange's draft and consumes the validated `ReviewResult`, distinguishing persisted review from synchronized correction.

- [ ] Test reversed filter completion order: only newest request controls rows/loading/error. Test 401, 500, malformed JSON, and network failure never authenticate, announce saved, close a draft, or render malformed statistics.
  With explicitly controlled A/B requests, resolve B then A and assert `expect(result.current.data).toEqual(responseB)`. Failed-save UI assertions include `expect(screen.queryByText('Saved')).not.toBeInTheDocument()` and unchanged input text.
- [ ] Run `npm test -- tests/components/admin-dashboard.test.tsx`; expect failure.
- [ ] Extract fetch lifecycles with abort and generation guards. Preserve drafts on failure; show actionable sync errors and retry. Derive current persona labels centrally while retaining historical display fallbacks. Add meaningful names to filter/label controls.
- [ ] Reduce pages to composition, preserve tabs/filters/pagination, and reuse Task 10's composer in capture. Run tests/typecheck/targeted lint; commit `Separate admin features and make request state reliable`.

## Task 12: Complete English and Korean PDF exports

**Files:** Create `lib/chat/export-pdf.ts`, `public/fonts/NotoSansKR-Regular.ttf`, `public/fonts/OFL.txt`, `tests/unit/pdf-layout.test.ts`, `tests/e2e/export.spec.ts`. Modify `components/ChatPanel.tsx`.

**Interfaces:** `layoutConversation(messages: readonly ChatUIMessage[], metrics: PdfMetrics): PdfLayout`; `exportConversation(messages: readonly ChatUIMessage[], options: { lang: Language; date: Date }): Promise<void>`. Define metrics/layout beside those functions: metrics supplies measured wrapping/page dimensions; layout returns ordered page/line placements. Preserve download filename convention.

- [ ] Write recording-sink tests: 60- and 200-line answers retain every line within A4 body margins, with correct message/page breaks and no empty preflight page. Test mixed Korean/English, empty input, stripped follow-up markup, and incomplete streams excluded or export disabled while streaming.
  For the 200-line fixture assert `expect(bodyLines).toHaveLength(200)` and `expect(bodyLines.every(line => line.y >= topMargin && line.y <= pageHeight - bottomMargin)).toBe(true)` using the fixture's A4 metrics.
- [ ] Run `npm test -- tests/unit/pdf-layout.test.ts`; expect failure.
- [ ] Acquire an official static embeddable Noto Sans KR regular TTF and its OFL license; verify Korean glyph coverage. If that exact distribution is unavailable, document an official licensed static Korean font substitution. Lazy-load/embed it with jsPDF. Use one layout cursor and per-page accents. Export errors stay visible/retryable.
- [ ] Generate synthetic English/Korean/long fixtures, render and inspect pages with PDF tooling, and check text extraction/bounds. Prepare a deterministic browser download test, run it once Task 14's runner exists. Run layout tests/typecheck; commit exporter and licensed assets, never real conversation fixtures.

## Task 13: Content shells, prototypes, and remaining code quality

**Files:** Create `components/work-samples/ArticleShell.tsx`, `lib/prototypes.ts`, `tests/unit/prototypes.test.ts`, `tests/components/work-samples.test.tsx`. Modify the four work-sample pages, both UI routes, `components/{ProfilePanel,TracePanel}.tsx`, `ui_test/ask-dj-prototype.jsx`, dependency manifests.

**Interfaces:** `PROTOTYPES: readonly Prototype[]`, with slug/filename/title/description; `findPrototype(slug: string): Prototype | undefined`; `ArticleShell` supplies shared navigation/title/children framing without a new content framework.

- [ ] Write allowlist tests for every existing slug and inherited/traversal/unknown names:
  ```ts
  expect(findPrototype('constructor')).toBeUndefined();
  expect(findPrototype('../README.md')).toBeUndefined();
  ```
  Route tests assert 404 before filesystem access. Work-sample tests preserve titles/navigation/authored text.
- [ ] Run `npm test -- tests/unit/prototypes.test.ts tests/components/work-samples.test.tsx`; expect inherited-key regression failure.
- [ ] Share catalog between gallery and route, remove unreachable JSX-serving branches, retain HTML assets. Fix the JSX prototype's actual declaration/effect/escaping errors. Extract only repeated article framing and preserve unique page structure/prose.
- [ ] Replace stale provider/model labels from public-safe configuration. Remove `@ai-sdk/google` and confirmed dead components only after reference checks and compatibility review. Avoid unrelated dependency upgrades. Run full lint/typecheck; fix remaining warnings without global suppressions. Commit coherent cleanup units.

## Task 14: Reproducible setup, integration checks, and final review

**Files:** Create `.nvmrc`, `.env.example`, `.prettierrc.json`, `.prettierignore`, `playwright.config.ts`, `tests/e2e/{routes,chat,admin}.spec.ts`, `tests/e2e/fixtures/chat-stream.ts`, `.github/workflows/ci.yml`, `tests/database/schema.test.sql`. Complete `docs/architecture.md`. Modify package manifests, `.gitignore`, README, review/design status, and `app/layout.tsx` only if locally hosting existing Geist fonts requires it.

**Interfaces:** Scripts `format:check`, `format`, `typecheck`, `test`, `test:e2e`, `check` (format/lint/types/offline tests), `db:test`, alongside current commands. Node 22 in `.nvmrc`. Placeholder-only environment template includes notification addresses; allowlist it after `.env*` and retain every Meta rule.

- [ ] Create deterministic Playwright tests: root redirect, `/dj`, all work samples, `/v1`, every prototype slug, admin unauthorized states, malformed public requests, intercepted streaming chat/reset, bilingual personas, and keyboard use. Check 320×568, 390×844, 844×390, and desktop with long labels/enlarged text; Start stays reachable. Record initial failures and fix the owning component without weakening assertions.
- [ ] Install Playwright tooling/browsers and run Task 12's export test. Keep API fixtures exclusively in tests; no production bypass flags. Package current Geist families locally with licenses if required for network-independent build; preserve typography.
- [ ] Add Prettier with explicit maintained-source/config/docs scope. Exclude authored data/historical HTML from mechanical formatting and all local ignored paths from tooling scans. Make formatting a separate commit; do not exclude active source to hide errors.
- [ ] Validate SQL against disposable PostgreSQL initialized with expected Supabase roles: fresh schema, additive adoption, RLS/service-role permissions, correction-state round trips. Implement `db:test` using a disposable local container or CI PostgreSQL service; it must refuse nonlocal/non-test connection strings. No real Supabase URL or live migrations.
- [ ] CI uses Node 22 and runs clean install, checks, build, deterministic browser tests, and disposable SQL tests. Unit/component suites reject unmocked external requests. Production build requires no AI/database credentials and no font download. Public defaults must be verified with optional services absent.
- [ ] Update README to verified final behavior: architecture, setup/schema adoption, auth/session changes, safe ingestion/dry-run, transcript formats, notifications, route compatibility, and offline/live evaluation. Move detailed boundaries to `docs/architecture.md`; retain explicit operational limitations.
- [ ] From a clean checkout run `npm ci`, `npm run check`, `npm run build`, `npm run test:e2e`, `npm run db:test`; expect zero errors/failing tests and all required routes. Inspect the diff for secrets/private files, broad suppressions, accidental content changes, or unsupported quality claims. Recheck original Meta hashes and preserved compatibility exports.
- [ ] Request independent whole-branch review against spec/plan. Resolve all critical/important findings and rerun affected checks. Commit verified changes and present the integration result; do not deploy, re-index, or migrate production. Name live-service behavior that remains unverified.

## Self-review coverage

| Design requirement | Owning tasks |
| --- | --- |
| Domain/schema/compatibility | 1–2, 8, 10, 13 |
| Auth, sessions, origin, diagnostics, admission | 2–3, 9 |
| Settings, checked writes, statistics, correction retry | 4–5, 11 |
| Transcript attribution and source integrity | 1, 6 |
| Provenance-aware ingestion and failure safety | 7 |
| RAG extraction, exact evidence, evaluator alignment | 8–9 |
| State races, IME, feedback, accessibility | 3, 10–11, 14 |
| Korean PDF and pagination | 12, 14 |
| Routes/prose, truthful labels, prototypes | 13–14 |
| Setup, schema validation, CI, review, private files | 14 |

All five Review Focus conditions have an owning task. Writing this plan is not completion of the refactor.

## Execution choice

Recommended: **subagent-driven execution**, one implementation task at a time with task-level independent review and a final whole-branch review. Authentication and knowledge-write changes justify detecting mistakes before dependent work is built on them.

Alternative: **native execution** in this session, then a fresh whole-branch reviewer. This uses fewer agent contexts but postpones independent review.

The user must review this plan and select an execution method before implementation, as required by the writing-plans workflow. No method has been selected yet.
