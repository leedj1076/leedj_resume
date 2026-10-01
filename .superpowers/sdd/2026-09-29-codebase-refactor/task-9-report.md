# Task 9 implementation report

Status: DONE

## Implemented

- Extracted `prepareAnswer` into a retrieval-only orchestration layer. It rewrites, embeds, retrieves, selects evidence, assembles context, and builds the prompt without generating the final answer. Company/section/time filters use the original visitor question. Nonbroad questions always run original-question Q&A matching; unchanged or failed rewrites reuse the first embedding.
- Added named provider operations for rewrite, embed, search, fetch, settings, streaming, and generation. SDK calls receive abort signals; Pinecone operations check cancellation before and after calls.
- Reduced public chat, prototype chat, and capture routes to admission/authentication, parsing, service calls, and HTTP error handling. Explicit `internal: true` must pass admin authentication before any chat provider call and never falls back to public admission. Parsed public requests consume their rate limit before validation.
- Preserved public SDK streams, init JSON welcome, prototype JSON response, capture stream, model and output-token limits, welcome/capture/prototype prompts, and existing `waitUntil` analytics delivery. Public metadata contains source labels from `context.usedChunks`; completed exchange logging uses those same IDs and excludes cancelled streams.
- Introduced discriminated trace steps and derived UI labels/model names from their payloads. The trace is included only for authenticated internal chat.
- Reworked the evaluator to call `prepareAnswer`, corrected its current-role expectation to Changjo, and added credential-free `--help` / `--offline` startup. Live evaluation is still opt-in and loads `.env.local` when present.

## TDD evidence

- RED: `npm test -- tests/server/chat-service.test.ts tests/server/chat-routes.test.ts` failed to resolve `@/lib/server/rag-service` before extraction. The initial tests specified ambiguous short-circuiting, unchanged/fallback rewrite matching, single-embedding reuse, and cancellation.
- GREEN: `npm test -- tests/server/chat-service.test.ts` passed 4/4 after the retrieval service was added.
- RED: the same focused suite failed 4 route tests against the old route implementations: malformed public requests skipped admission, successful chat and capture streams returned JSON errors, and prototype JSON failed without real provider credentials.
- GREEN: focused route and service tests passed 13/13 after thin routes and services were wired.
- RED: a prototype regression test failed because a repeated semantic match replaced pinned text in the assembled prompt.
- GREEN: after first-seen deduplication, the focused service suite passed 11/11.

## Final checks

- `npm test`: 14 files, 134 tests passed. Vitest emitted only its non-failing jsdom performance suggestion.
- `npm run typecheck`: passed.
- Scoped `npm run lint --` over changed TypeScript/TSX files: passed with no warnings or errors.
- `npm run eval -- --offline`: `12 retrieval cases ready (offline; no provider calls).`
- `npm run eval -- --help`: printed usage and exited without credentials.
- `git diff --check`: passed.
- No live provider evaluation, ingestion, migration, deployment, or personal file edits were performed.

## Files changed

`app/api/chat/route.ts`, `app/api/ui-chat/route.ts`, `app/api/capture/route.ts`, `components/TracePanel.tsx`, `lib/rag/labels.ts`, `lib/rag/trace.ts`, `lib/server/providers.ts`, `lib/server/rag-service.ts`, `lib/server/chat-service.ts`, `lib/server/prototype-service.ts`, `lib/server/capture-service.ts`, `lib/types.ts`, `scripts/eval.ts`, `package.json`, `tests/server/chat-service.test.ts`, `tests/server/chat-routes.test.ts`.

## Self-review and concerns

Self-review found and fixed pinned/semantic duplicate precedence in prototype chat and ensured trace duration includes streaming completion. Pinecone's query/fetch API does not expose a cancellation signal in this adapter, so an in-flight Pinecone call can finish after the client aborts; the service checks the signal before any later stage or completion log. No other known concerns.

## Round 1 review fix: prototype ranking policy

Restored the prototype route's original section weight × focus skill match score, stable first-15 selection, and ranked `chunksUsed` order. It still uses shared provider normalization, context assembly, cancellation guards, and first-seen pinned deduplication. The public `selectEvidence` policy was not changed. Prototype selection no longer applies public-only suppression, core-strength or persona adjustments, or semantic-score weighting.

### TDD evidence

- RED: `npm test -- tests/server/chat-service.test.ts` failed 2 of 14 tests. The former policy expected `[interview-q2.1-why-vc, another-why-vc, ordinary-project]`, but suppression and persona dampening returned `[ordinary-project, another-why-vc]`. The first-15 fixture expected the suppressed first candidate and excluded `focused-5`, but the core-strength multiplier promoted `focused-5` into the result.
- GREEN: `npm test -- tests/server/chat-service.test.ts` passed 14/14 after the policy fix.
- Final `npm test`: 14 files, 137 tests passed. Vitest emitted its non-failing jsdom performance suggestion.
- `npm run typecheck`: passed.
- `npm run lint -- lib/server/prototype-service.ts tests/server/chat-service.test.ts`: passed.
- `git diff --check`: passed.

### Changed files and concerns

`lib/server/prototype-service.ts`, `tests/server/chat-service.test.ts`, and this report. Self-review confirmed the prototype service retains first-seen pinned precedence and the shared context formatter. No known concerns from this fix; no live providers, ingestion, migration, deployment, or private files were touched.
