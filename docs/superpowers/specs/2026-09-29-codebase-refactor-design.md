# Ask DJ codebase refactor

Date: 29 September 2026

Status: Proposed design for review; implementation has not started

Baseline: `12f13a2`

Evidence: [baseline review](../../reviews/2026-09-29-codebase-review.md)

## Intent

Make this repository a credible example of thoughtful engineering: a reader can find the behavior they care about, understand its dependencies, and change it with useful tests. Replace the scaffold README with an accurate account of the product, architecture, setup, and operational limits.

The user requested a comprehensive refactor and explicitly requested Superpowers code review. The default assumption is to preserve all existing routes, the current visual design, authored career content, and the existing service providers. Personal Meta preparation remains local-only and ignored. “Perfect” is translated into reviewable contracts and acceptance checks rather than an untestable guarantee.

## Approaches considered

| Approach | Benefit | Cost |
| --- | --- | --- |
| Formatting and file splitting only | Small diffs | Leaves access-control, data-loss, state, and validation defects intact |
| Incremental refactor around tested boundaries — recommended | Fixes concrete defects while preserving product behavior; changes remain reviewable | Requires deliberate regression fixtures and integration checks |
| Rewrite into a new framework or service architecture | Maximum freedom to reorganize | Unnecessary migration risk and infrastructure for a small application |

Keep Next.js App Router, React, TypeScript, the AI SDK, Pinecone, and Supabase. Extract modules around actual responsibilities; do not introduce a dependency-injection framework, generic repository superclass, event bus, or new backend service.

## Compatibility and scope

Preserve `/dj`, all four work-sample pages, `/v1`, `/ui`, the prototype routes, and the admin workflows. Preserve public streaming and prototype JSON response formats, valid persona aliases, authored text, bilingual selection, dark mode, source labels, and conversation export. Keep retrieval weights, thresholds, and prompt intent unless a verified correctness defect requires a documented change.

Intentional behavior corrections include unauthorized diagnostics being rejected, malformed or oversized requests receiving client errors, saves showing real failures, reliable cancellation, consistent persona options, corrected transcript attribution, and ingestion preserving corrections.

No live re-index, production database migration, model evaluation against paid services, deployment, or modification of personal untracked files is part of implementation verification. Database migrations and ingestion commands will be made reviewable and tested locally. Running those against production is a separate operational action.

Existing ignored Meta pages import shared profile/settings modules. Preserve their current import paths through small compatibility exports where modules move; do not copy their content into a refactor branch, test fixture, or public commit.

## Architecture

```text
app/                         Next.js routing, HTTP adapters, page composition
components/
  profile/                   Profile navigation, persona controls, content
  chat/                      Messages, composer, follow-ups, feedback
  admin/                     Login, reviews, analytics, settings, capture
  work-samples/              Shared article shell
  ui/                        Existing primitive components
hooks/                       Conversation and admin request lifecycle hooks
lib/
  domain/                    Shared persona, language, message, knowledge types
  chat/                      Pure message, transcript, and PDF helpers
  rag/                       Retrieval plans, ranking, context, prompts
  server/                    Auth, configuration, providers, persistence, orchestration
scripts/                     Thin ingestion, structuring, and evaluation entry points
tests/                       Offline regression and browser fixtures
database/                    Versioned Supabase schema and adoption notes
docs/                        Architecture decisions, review, and workflow documentation
```

These are responsibility boundaries, not a requirement to create a file for every function. Keep related small functions together. Prefer clear named inputs/results over positional arrays and casts. Document why a policy exists; avoid comments that merely narrate the next line.

Client components may import shared domain and browser modules. Provider credentials, database clients, and privileged services belong to server-only modules. Pure retrieval/formatting modules must be importable by offline tests without constructing live clients.

### Domain and request contracts

Create one canonical source for persona IDs, labels, legacy aliases, focus values, and language conversion. Derive form options and validators from those definitions. Use own-property-safe lookup, not unchecked dictionary indexing. Continue accepting existing legitimate aliases.

Declare Zod directly and use explicit runtime schemas at untrusted boundaries: incoming JSON, provider metadata, model rewrite results, and knowledge files. The knowledge schema must accept all existing legitimate records and stable IDs. Stricter authoring rules may apply to new records without silently rewriting historical IDs.

Chat validation permits supported user/assistant text messages, rejects privileged roles and unsupported input parts, requires an appropriate final user message, and enforces message/history/request limits. The same normalized messages feed retrieval and generation. Returned assistant metadata is not trusted as an authorization source. Limits and typed error responses live in shared policy modules.

### Authentication and privileged operations

Keep a single-owner password login, with authentication enforced by the server. Exchange a verified configured password for a short-lived signed session in an HttpOnly, SameSite cookie; use Secure cookies in production. A missing/empty secret always fails closed. Session expiry and secret rotation invalidate access. Mutating cookie-authenticated endpoints validate request origin.

Centralize session verification for admin APIs, capture, internal diagnostics, and internal feedback. A body flag alone never grants privileges or suppresses logging. Public requests continue receiving useful source labels, but never raw internal prompts or diagnostic context. Internal requests omit analytics and new-visitor alerts consistently after authorization.

Remove browser-stored raw passwords. Centralize login, expiry, unauthorized handling, and logout. This replaces implementation details of authentication while preserving the single-password owner workflow; it does not add accounts or an external identity provider.

Public AI routes share input bounds and an expiring, size-bounded per-instance limiter. Document that it is not a global quota; do not add Redis solely for this refactor. Provider initialization validates required configuration when that capability is used, so optional services remain optional.

### RAG pipeline

Keep the HTTP handler short: parse and authorize, invoke the chat service, adapt the result to the existing AI SDK response, and translate known errors.

Separate the pipeline into:

- **Rewrite:** classify intent and normalize model output; retain a deterministic history-based fallback.
- **Retrieval plan:** represent semantic, entity, focus, pinned, and original-question searches as typed named operations.
- **Provider adapter:** execute the plan through Pinecone and normalize metadata once.
- **Selection:** suppress unsuitable records, detect direct matches, and rank candidates with existing persona policy.
- **Context:** return `{ text, usedChunks, primaryChunkId }`; source labels and exchange records use exactly this evidence.
- **Prompt construction:** assemble shared accuracy, language, answer-mode, and persona instructions without hiding provider calls inside formatting functions.
- **Orchestration:** coordinate cancellation, tracing, settings reads, generation, and post-response effects.

Reuse embeddings when original and rewritten queries match, including fallback cases. Include ongoing roles in temporal retrieval without treating undated records as arbitrary current employment. Preserve deduplication and suppression on every retrieval path.

The live evaluator imports production retrieval/selection units rather than maintaining a second approximation. Offline cases use fixed records and provider adapters to verify actual policy. Live retrieval evaluation remains a separate command. Generated-answer quality remains unverified unless a separate evaluation is explicitly designed and run.

### Persistence and notifications

Centralize typed database results and check every returned error. Required writes fail visibly; optional analytics failures remain observable without interrupting a visitor's answer. Settings writes cannot announce success before persistence, and reads cannot keep an indefinite instance-local answer-mode cache.

Review corrections need explicit state: a stored review is not synonymous with a successfully indexed correction. Record pending/applied/failed synchronization and support retry. Preserve the existing correction ID convention and original exchange linkage.

Version the three existing table contracts and any additive correction-state fields. Include adoption notes for an existing installation rather than assuming an empty database. Session/statistics queries must handle more rows than a default Supabase response cap; put complete aggregation behind one tested repository operation.

Use typed event/exchange records instead of arbitrary dictionaries. Preserve `waitUntil` around background work. Send safely encoded notification content, validate recipient configuration, and avoid logging secrets or unnecessary visitor content.

### Knowledge lifecycle

Define a shared transcript contract with explicit interviewer and subject roles. Support capture exports and documented legacy input formats; test a capture-export-to-parser round trip. The structurer must never silently swap speakers. Validate generated records before append, reject duplicate IDs, and avoid partially overwriting source files.

Replace namespace-wide ingestion deletion with an explicit synchronization plan:

1. Validate all input and compute source-owned records before provider mutations.
2. Offer a dry run listing additions, updates, and eligible deletions.
3. Upsert validated source records before pruning stale source-owned IDs.
4. Never delete admin corrections or records whose ownership is unknown.
5. On a failed upload, retain existing records and skip pruning; rerunning is safe.

Tag new source-managed records with provenance. Historical records without ownership metadata remain untouched by automatic pruning; adoption of legacy data is documented rather than guessed. This is an idempotent non-destructive synchronization design, not a claim of atomic multi-record writes.

Keep OpenAI/Pinecone access in command/service adapters. Shared schema, enrichment, date handling, transcript parsing, and synchronization planning are pure modules. No test needs production credentials or a live namespace.

### Frontend

Move transport, request context, initialization, cancellation, reset, feedback, and trace selection into a conversation controller. Use a stable transport and explicit state transitions that satisfy React's lifecycle rules. Reset cancels active work, clears errors/selection, and prevents late responses from reappearing. Legacy welcome initialization follows the same lifecycle guarantees.

Extract focused presentation components without changing existing styling. One persona resolver supplies mobile, desktop, welcome, and admin selectors. Composer submission handles IME composition, Shift+Enter, empty input, and streaming state consistently.

Split the dashboard into review, analytics, and settings features. A shared typed request client checks status and response shape. Request cancellation or generations prevent stale filters from winning. Failed saves preserve drafts, display actionable errors, and remain retryable.

Extract PDF generation from message rendering. Use one pagination cursor and a font with verified Korean coverage and redistributable licensing. Test long answers and inspect rendered English/Korean output. Message parsing and export must remove follow-up control markup.

Give dialogs viewport containment, inputs meaningful labels, selectors announced state, and completed responses appropriate live-region behavior. Follow streaming output only while the reader is near the bottom. Synchronize document language with the selected language.

Work-sample pages share an article shell while keeping their authored prose and page-specific structure. A single prototype catalog drives the gallery and allowlist. Historical assets remain accessible, while unreachable branches and confirmed unused dependencies/components can be removed after a reference check.

## Verification and definition of done

Use Vitest for offline units and request/service contracts, React Testing Library for lifecycle behavior, and a focused Playwright smoke suite for routes, responsive controls, keyboard behavior, and mocked chat streams. Tests exercise outcomes and boundary cases, not line counts or copies of implementation logic.

Required checks:

- Clean install from the lockfile; documented Node version and explicit dependencies.
- Formatting check, ESLint, TypeScript, offline tests, and normal production build pass in a clean checkout.
- Fail-closed authentication, session expiry/origin rules, privileged-message rejection, trace access, and shared admission control have negative-path tests.
- Knowledge validation, transcript speaker round trips, correction preservation, and partial-ingestion failures have offline tests.
- Retrieval tests cover suppression, original-query reuse, temporal ongoing roles, direct matches, and exact context provenance.
- Settings and review failures remain failures across the service and UI boundary; session totals handle multi-page datasets.
- Chat tests cover late chunks after reset, welcome races, IME, stale admin responses, consistent personas, feedback retry, and source rendering.
- Browser checks cover current and legacy routes, public/admin unauthorized states, desktop/mobile layouts, narrow welcome dialogs, and the prototype allowlist.
- Export checks preserve every line within page margins and verify readable Korean text.
- README setup, architecture, command names, route inventory, schema instructions, and quality claims match the final implementation.
- Final independent code review has no unresolved critical or important findings in the changed scope. Any unavailable live-service verification is named explicitly.
- The committed tree contains no Meta preparation or unrelated local files, and the originals remain unchanged.

CI runs offline checks and a deterministic build without production credentials. It does not run ingestion, live evaluation, notification sends, or database mutations. Build-time settings fallback must be tested rather than requiring real services in CI.

## Delivery sequence

First establish shared contracts and regression fixtures. Then secure the server boundary, make knowledge/persistence operations reliable, extract and verify the RAG pipeline, refactor frontend controllers and presentation, and finish setup/documentation and cross-feature verification. Review each coherent change as it is completed.

Use an isolated `codex/` branch/worktree for implementation. Keep personal files in their existing checkout. Preserve compatibility exports needed by local-only consumers. Commit related changes in reviewable units, and update this design if evidence requires a material architectural change.

After design approval, create the detailed implementation plan with concrete files, dependencies, test commands, and checkpoints. The implementation plan is a separate artifact; this document defines what must be true and why.
