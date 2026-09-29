# Codebase review — 29 September 2026

Baseline: `12f13a25a87845523d306ff5da2c804e74648a9e`.

This review covers the tracked application, service helpers, data scripts, and project configuration. Three independent reviews examined server behavior, frontend behavior, and setup/documentation. Findings were consolidated against the source. Personal Meta preparation, unrelated untracked files, credentials, and live service state were excluded.

## Assessment

The product has a useful foundation: typed bilingual content, persona configuration, query-rewrite fallbacks, suppression of unsuitable evidence, deduplication by chunk ID, streaming cancellation on final generation, and background writes protected with `waitUntil`.

The main problem is uneven ownership of behavior. HTTP validation, retrieval policy, provider calls, prompts, and persistence share a 1,010-line chat handler. The 1,266-line dashboard mixes authentication, fetching, editing, aggregation presentation, and settings. Several errors arise at those boundaries rather than from formatting or naming.

Refactor by establishing contracts and regression tests, then extracting coherent modules. Keep the existing product and authored content. Correct the defects below explicitly instead of freezing them as compatibility requirements.

## Baseline checks

| Check | Result |
| --- | --- |
| Production build of tracked snapshot | Passed: `npm run build -- --webpack` |
| Main route in built manifest | `/dj` present |
| Ignored Meta routes/assets in tracked build | Absent |
| ESLint on tracked snapshot | 14 errors, 8 warnings |
| Checked-in offline tests | None |
| Checked-in CI workflow | None |
| Checked-in database schema/migrations | None |
| Source data | 41 resume records, 51 knowledge records; IDs unique across both |

Webpack was used for the clean snapshot because dependencies were symlinked from the working checkout. This verifies a production build and TypeScript compilation, not a fresh default-Turbopack build. The proposed completion gate includes the normal build command from an isolated checkout with its own dependencies.

Lint errors are six `react-hooks/refs` errors, one `react-hooks/set-state-in-effect`, one `react-hooks/immutability`, and six `react/no-unescaped-entities` errors. They occur in capture, internal login, the profile controller, and the historical JSX prototype. Warnings include stale hook dependencies and unused declarations. Do not resolve active-code failures by globally disabling the rules.

## High-priority findings

| Finding | Evidence at baseline | Effect and correction |
| --- | --- | --- |
| Admin authentication fails open if unconfigured | `app/api/admin/{exchanges,review,settings,stats}/route.ts`, password comparisons at lines 7, 10, 16, 7 | Missing request password equals missing environment secret. Reject missing/empty configuration and invalid credentials centrally before any service access. |
| Public requests can enable internal diagnostics | `app/api/chat/route.ts:214`, `:902`, `:946` | `internal: true` exposes prompts and selected resume context without authorization and suppresses tracking. Derive diagnostic permission on the server. |
| Client message roles and size are not normalized | `app/api/chat/route.ts:273`, `:840`; `app/api/ui-chat/route.ts:175` | The installed SDK preserves client-supplied system messages. Retrieval truncation does not bound messages sent to generation. Parse and limit the entire request and use the normalized result throughout. |
| Re-ingestion deletes corrections and risks partial replacement | `scripts/ingest.ts:198`, `:244`; `app/api/admin/review/route.ts:63` | Namespace deletion erases remote-only corrections and precedes upload success. Replace blanket deletion with explicit ownership and safe synchronization. |
| Capture transcript parsing reverses speakers | `app/admin/capture/page.tsx:106`; `scripts/structure.ts:71`, `:183` | Capture exports DJ as Human and interviewer as Assistant; parser treats Human as question and Assistant as answer. Define and test a shared transcript format before generating knowledge. |

These findings are source-level defects, not claims that a live deployment has been exploited. No live provider calls or database changes were made during review.

## Server and data correctness

- **Settings can claim success without persistence.** `lib/settings.ts:36`, `:85`, `:149` ignore returned database errors. The answer-mode cache at line 11 never refreshes across warm instances and changes before persistence succeeds. Check writes, expose failures, and remove indefinite caching.
- **Notification content is unescaped.** `lib/email.ts:27` interpolates public input into HTML. Use escaped text or plain-text notifications. Internal chat also currently sends first-message alerts despite tracking exclusion.
- **Prototype chat bypasses admission control.** `app/api/ui-chat/route.ts:46` makes paid calls without the main route's rate limit. Share validated inputs and admission policy across public AI entry points. A process-local limit is still not a deployment-wide quota.
- **Ongoing roles miss temporal filtering.** `scripts/ingest.ts:214` maps null end dates to zero; `lib/entity-detection.ts:62` requires an end date after the requested period. Account for ongoing roles with known start dates.
- **Source metadata does not describe the actual prompt.** `app/api/chat/route.ts:764`, `:926`, `:937` uses a primary answer plus five supplementary records for direct matches, but reports all ranked records. Context assembly should return the exact evidence used.
- **Unchanged rewrites disable prepared-answer matching.** `app/api/chat/route.ts:464`, `:655` omits the raw embedding when it equals the rewritten query, then requires that embedding for direct matching. Reuse it rather than dropping this branch.
- **Persona validation accepts inherited properties.** `lib/visitor-data.ts:34` treats inherited dictionary keys such as `constructor` as aliases. Local execution confirmed values that violate the declared `Persona` type. Use own-key lookup and validate the result.
- **Database setup is not reproducible.** The application expects three tables, but no schema or migration is tracked. Version the schema and document adoption for existing databases; do not silently apply it to production.
- **Session totals can be incomplete.** `app/api/admin/stats/route.ts:21` and `exchanges/route.ts:23` assume an unbounded database response. Aggregate in the database or explicitly page through rows, rather than relying on a default response limit.
- **Data schemas have drifted.** The structuring schema excludes 19 existing knowledge records by section and 21 by ID format. Validate current data without renaming referenced IDs or silently dropping entries.
- **Evaluation duplicates stale retrieval logic.** `scripts/eval.ts:121` omits production rewrite, intent, suppression, direct matching, and reranking. Share production units with offline regression tests and a separately invoked live evaluator.
- **Dependency declarations are inaccurate.** `scripts/structure.ts:6` imports `zod` without declaring it directly. `@ai-sdk/google` has no tracked TypeScript consumers.

## Frontend correctness

- **Mobile persona settings differ from desktop.** `components/ProfileApp.tsx:280` uses static options rather than the filtered, relabeled options. A shared selector must preserve admin visibility and labels at every viewport.
- **HTTP failures are treated as success.** Dashboard save/review/login handlers do not consistently check `res.ok`. Error-shaped stats at `app/admin/dashboard/page.tsx:209` can crash `Object.values` at line 831. Use validated responses and explicit pending/success/error states; preserve drafts after failure.
- **Reset does not stop an active response.** `components/ProfileApp.tsx:151` clears messages only. The SDK can insert a later stream chunk into the cleared conversation, and selected traces remain stale. Cancel active work and invalidate stale completions as part of reset.
- **PDF pagination loses long answers.** `components/ChatPanel.tsx:158` renders with `ty` while pagination checks `y`. A local recording-sink probe of a 60-line answer put 10 lines beyond A4 bounds. Use one cursor and test multiline/page-boundary behavior. Korean glyph coverage also needs verification; the current font is Helvetica.
- **Enter does not respect IME composition.** `components/ChatPanel.tsx:217` and capture's composer submit without checking composition state. Test Korean composition, normal Enter, and Shift+Enter.
- **Filter requests race.** Dashboard fetches at line 173 can resolve out of order and overwrite the newest filter. Cancel obsolete requests or reject stale completions.
- **Legacy initialization overwrites conversations.** `app/v1/page.tsx:130` allows a delayed welcome request to replace newer messages. Validate welcome responses and coordinate initialization, reset, and send states.
- **The mandatory welcome dialog lacks viewport containment.** `components/V14WelcomeModal.tsx:36` has fixed generous padding without max-height or scrolling. Verify narrow/short viewports and keyboard access; this was identified from layout constraints, not a browser reproduction.
- **Prototype dictionary keys can throw.** `app/ui/[name]/route.ts:25` accepts inherited properties into a path operation. Local calls with inherited-key names threw instead of returning 404.
- **Feedback failures are invisible.** `components/FeedbackButtons.tsx:14` disables controls before persistence, while the caller discards failures. Add pending and retry states.
- **Accessibility and labels need consistency.** Add selected-state semantics, input names, message/status announcements, and document-language updates. Avoid forcing the scroll position when the reader has moved away from the bottom.
- **Provider labels have drifted.** The profile credits Gemini and the trace UI says GPT-5.4 while active generation uses a different configured model. Derive labels from truthful public configuration.

## Refactor priorities

1. Define request, identity, message, knowledge, and persistence contracts, with regression cases for the verified defects.
2. Secure privileged operations and correct data-loss paths.
3. Extract the chat pipeline into typed retrieval, selection, context, prompt, and orchestration units.
4. Separate profile/chat state and dashboard request lifecycles from presentation.
5. Consolidate shared content shells and prototype metadata; preserve authored content and existing routes.
6. Add repeatable setup, schema files, offline tests, and CI. Keep live evaluation separate.

See the [design proposal](../superpowers/specs/2026-09-29-codebase-refactor-design.md) for the proposed architecture and acceptance criteria.

## Review limits

No live credentials, Supabase schema/RLS, vector contents, provider availability, or deployed site were inspected. No judgment was made about resume truth, optimal persona weights, or generated-answer quality. Prototype HTML interiors were not exhaustively reviewed. Browser accessibility, pixel fidelity, and rendered Korean PDF output remain verification work for implementation.
