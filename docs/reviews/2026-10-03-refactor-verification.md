# Final refactor fixes and verification

The final implementation wave addresses all seven findings from the whole-branch
review at `03b3816`. **The controller's scoped re-review is pending.** This record
is implementation evidence, not an independent review approval or deployment.

## Resolved behavior

| Finding                                               | Implementation and regression coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1: capture/internal expiry loses work                | A page-owned memory store sits above the authentication gate. It retains the latest 50 messages within 500,000 message-JSON characters and a 2,000-character composer draft. Protected content unmounts on expiry; pending chats abort. Reauthentication creates a fresh SDK chat from the isolated snapshot. Explicit logout replaces the store; reload/navigation discards it. Integrated tests cover real gate login, submitted and unsent text, hidden protected content, logout clearing, late success and late 401 after cancellation. |
| F2: StrictMode review saves never settle              | Effect setup marks the editor mounted and cleanup clears it. Tests cover successful and failed saves under StrictMode and a response after genuine unmount.                                                                                                                                                                                                                                                                                                                                                                                  |
| F3: stopping before the first delta poisons history   | All three SDK transports share outgoing-history normalization for known empty assistant placeholders. Real SDK tests stop after text-start, send again, and pass the actual outgoing body through server validation while preserving earlier questions/answers. Blank users and unsupported roles/parts still fail validation.                                                                                                                                                                                                               |
| F4: evaluator provider imports require Next           | Configuration uses package-local `#server-only`: plain Node resolves a runtime guard, while browser resolution uses Next's server-only marker. A Node/tsx subprocess imports the vector boundary without a Vitest alias or network. An actual negative Next client build rejects the configuration import. No dependency version or lockfile changed.                                                                                                                                                                                        |
| F5: case variants in transcript literals become turns | Serializer escaping and parser unescaping use the same case-insensitive speaker vocabulary. Lowercase, uppercase, mixed-case and backslash-prefixed literals round-trip exactly.                                                                                                                                                                                                                                                                                                                                                             |
| M1: stopped follow-up data enters PDFs                | A recognized unfinished trailing follow-up block is omitted from display/export while retaining the answer. Both pure PDF layout and a real SDK stream stopped inside the control block are covered.                                                                                                                                                                                                                                                                                                                                         |
| M2: legacy welcome omits a canonical persona          | Legacy choices derive from canonical options, retain existing recruiter wording and styling, and map Korean labels to the legacy `ko` convention. Both languages can select strategic partnerships.                                                                                                                                                                                                                                                                                                                                          |

## Final offline gates

Executed in the isolated `codex/resume-refactor` worktree using Node 22.21.1.

| Command                                                                                                                                                            | Result                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                                                                                                    | Formatting, ESLint, TypeScript and 25 Vitest files / 223 tests pass.                                                                                                      |
| `env -u OPENAI_API_KEY -u PINECONE_API_KEY -u SUPABASE_URL -u SUPABASE_SERVICE_ROLE_KEY -u ADMIN_PASSWORD -u ADMIN_SESSION_SECRET -u RESEND_API_KEY npm run build` | Production build passes for 22 routes without provider credentials.                                                                                                       |
| `CI=1 npm run test:e2e`                                                                                                                                            | 33 Chromium tests pass against a fresh local production server, including route, synthetic streaming, bilingual PDF download/extraction, and responsive welcome coverage. |
| `npm run eval -- --offline`                                                                                                                                        | Lists 12 retrieval cases without provider calls.                                                                                                                          |
| `npm run eval -- --help`                                                                                                                                           | Prints retrieval-only evaluator usage.                                                                                                                                    |
| `npm test -- tests/server/cli-import.test.ts`                                                                                                                      | Plain Node/tsx provider import passes with fetch disabled, independently of Vitest's module alias. Also included in the full check.                                       |
| `git diff --check`                                                                                                                                                 | Passes.                                                                                                                                                                   |
| `git diff --exit-code 03b3816 -- database tests/database scripts/db-test.mjs package-lock.json`                                                                    | No changes.                                                                                                                                                               |

For the negative client-boundary check, a temporary `app/boundary-probe/page.tsx`
contained:

```tsx
"use client";
import { getSupabaseCredentials } from "@/lib/server/config";
export default function BoundaryProbe() {
  return <pre>{JSON.stringify(getSupabaseCredentials())}</pre>;
}
```

The credential-free build command above exited 1 with
`'server-only' cannot be imported from a Client Component module`, tracing
through `lib/server/config.ts`. The temporary route was removed and
`npx next typegen` regenerated route declarations. The final normal build and
browser suite passed without the probe. No credentials were used in the probe.

Vitest's existing worker-isolation performance hint and the browser runner's
`NO_COLOR`/`FORCE_COLOR` warning remain informational; there were no ESLint
warnings or test failures in the final runs.

## Verification limits

Database SQL, its assertions, runner, and correction persistence were unchanged.
The earlier fresh-schema/adoption, individual-privilege mutation checks and
two-connection claim verification remain the existing coverage; this wave did
not rerun disposable SQL tests or claim new database evidence.

No real OpenAI/Pinecone request, live evaluation, ingestion, email delivery,
production database access, production adoption, deployment, remote CI, or
original-checkout modification was performed. Retrieval weights, provider/SDK
security pins, authored career content, and local personal files are unchanged.
Conversation retention is bounded and memory-only, so page reload/navigation
intentionally clears it; this is not durable autosave.
