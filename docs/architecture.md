# Architecture

The public `/dj` route loads bilingual profile data and optional settings.
Missing or unreadable optional settings use checked-in defaults. The browser
selects persona and language, then sends bounded chat history to `/api/chat`.
The server validates request shape and size, applies a process-local limiter to
public requests, and requires the signed owner session for `internal: true`.
Unparseable JSON cannot establish an internal exemption and is charged to the
public limiter. The internal debugger and capture route never fall back to
public access after an unauthorized request. Mutating owner requests require
the request `Origin` to match the server URL.

The limiter uses the first `X-Forwarded-For` address supplied by the hosting
proxy. A deployment must have a trusted reverse proxy that overwrites this
header; direct public access to the Node server would let clients spoof the
key. Limits are per-process, not shared across instances. They are an abuse
control, not an account quota.

The chat service shares retrieval preparation with the live evaluator. Query
normalization and intent classification lead to Pinecone retrieval, metadata
filtering, persona/focus reranking, and source-context assembly. Ambiguous
questions can produce a streamed clarification. Other answers stream through
the AI SDK; metadata carries source labels, and owner-only responses carry
bounded diagnostic traces. Prompt grounding is an instruction to the model,
not a guarantee of factual correctness. `npm run eval` measures retrieval
recall against prepared cases, not generated-answer accuracy. All live model
and index behavior remains unverified by the offline suite.

Public conversation and feedback events use optional Supabase persistence;
the owner dashboard requires it. New public sessions may trigger a Resend
alert only when all three notification variables are set. Internal traffic
does not send alerts or write public analytics. Alerts use Vercel `waitUntil`
for background delivery. Other hosts need an equivalent lifetime guarantee
for background work.

## Owner data and consistency

`database/001_initial.sql` creates the three application tables with RLS
enabled and service-role grants. `002_correction_sync.sql` adds correction
state and claim/finalization functions. Both must be reviewed and applied
manually; the application never migrates a database. A compatible existing
schema may adopt 002 after inspection and backup. The disposable `db:test`
runner checks fresh and adoption paths, permissions, state transitions, and
overlapping claims using two PostgreSQL connections. It accepts no external
database URL.

Review saves are claimed atomically with the pending correction text. Only the
owner token can finish or release a claim. Rejected/uncertain Pinecone upserts
retain the claim because a provider write may still complete. Manual recovery
requires confirming that the original worker and provider request have ended
before clearing the claim fields together. See `database/README.md`.

Dashboard aggregation scans exchanges in ascending identity pages of 500,
then restores `(created_at, id)` order for session and date calculations.
Identity cursoring avoids offset skips when earlier rows are deleted between
page requests. This is a **moving read**, not a transaction snapshot: a row
inserted with an ID above the current cursor may appear during the scan;
updates to already-read rows and inserts with explicit lower IDs will appear
on a later request. The dashboard totals are consequently approximate under
concurrent writes, while each returned scan avoids duplicate IDs and offset
shifts. Page sizes remain 10 sessions and 20 exchanges.

Owner authentication requires both `ADMIN_PASSWORD` and
`ADMIN_SESSION_SECRET`, even for an existing cookie. The signed cookie expires
after eight hours and is `HttpOnly`, `SameSite=Strict`, and `Secure` in
production. Owner pages show sign-in after expiry. Bounded drafts in capture
and the internal debugger survive reauthentication in memory; explicit
sign-out clears them. No password is stored in browser storage.

## Content and exports

`data/resume.json` and `data/knowledge_entries.json` own indexed career
records. Profile presentation lives separately in `lib/profile-data.ts`.
`lib/domain/` contains shared schemas and persona normalization;
`lib/server/` owns provider access, storage, request policy, and RAG behavior.
`lib/chat/` owns transcript and PDF export logic. Existing public imports
through `lib/settings.ts`, `lib/persona-config.ts`, and other compatibility
paths remain available.

Capture exports versioned JSON (`version: 1`, explicit
`interviewer`/`subject` turns) and versioned labelled text. The parser also
accepts legacy capture JSON arrays, explicit Q/A text, and opt-in legacy
`Assistant`/`Human` text with `--format capture-legacy`. It rejects ambiguous
unlabelled prose before generation or writes. Structuring checks IDs,
optionally deduplicates through Pinecone, and atomically appends accepted
entries to the source JSON. It does not index them.

The browser exports conversation PDFs with a bundled static Noto Sans KR
font, including Korean text, page boundaries, and a downloadable filename.
The [font provenance](../public/fonts/README.md) is tracked. Geist Sans and
Geist Mono come from the local `geist` package at build time.

## Knowledge ingestion

`scripts/ingest.ts` reads and validates `data/resume.json` and optional
`data/knowledge_entries.json`, then delegates to `syncKnowledge`. The source
must be nonempty, have unique stable `chunk_id` values, and contain no IDs
starting with the reserved `dj-correction-` prefix. Validation finishes before
provider access. The namespace is `resume`; embeddings use
`text-embedding-3-large` at 3072 dimensions. A missing index is created with
the existing cosine, AWS `us-east-1` serverless configuration.

The service lists every vector ID in the namespace, fetches metadata in batches
of 100, and builds a complete plan before writing. Source vectors receive the
`source_owner: "ask-dj:json:v1"` marker. Every source ID is upserted in batches
of 100; only after every upload succeeds does the service delete stale IDs that
carry that exact marker. IDs beginning `dj-correction-` and vectors without the
marker remain untouched, including legacy data. Legacy cleanup is a separate,
reviewed operation, never an automatic part of ingestion. An interrupted upload
can be safely rerun because the source IDs are stable and pruning has not begun.

`npm run ingest -- --dry-run` reads the configured index and prints the planned
creates, updates, deletions, and preserved IDs. It does not request embeddings,
create an index, upsert, or delete vectors. It still needs read access to the
configured Pinecone index when that index exists. A normal run is the operation
that changes the index; neither mode should be used against production without
reviewing the source and plan first.
