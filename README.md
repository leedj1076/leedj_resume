# Ask DJ

Ask DJ is Dong Jae Lee's bilingual professional profile. Visitors can read his
career and four work samples, choose a visitor perspective, and ask questions
through a streaming chat grounded in curated career records. The owner can
inspect conversations, review answers, add corrections, adjust settings, and
capture interview material. `/` redirects to `/dj`.

The app uses Next.js 16, React 19, TypeScript, the AI SDK, OpenAI, Pinecone,
Supabase, and optional Resend notifications. The public profile renders without
provider credentials. Live chat needs OpenAI and Pinecone; persistence and owner
workflows need Supabase and admin credentials. [Architecture and operational
boundaries](docs/architecture.md) describes each path in detail.

## Local setup

Use Node 22 (`.nvmrc`), npm, and Docker for database tests:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/dj](http://localhost:3000/dj). The profile and
work samples load with no environment file. For live integrations, copy
`.env.example` to `.env.local` and replace its placeholders with development
credentials. Never commit that file or expose the Supabase service-role key to
the browser. `OPENAI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX_NAME`
enable live chat and indexing. `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` enable persistence. Both `ADMIN_PASSWORD` and
`ADMIN_SESSION_SECRET` are required for owner sign-in. All three
`RESEND_API_KEY`, `RESEND_FROM`, and `RESEND_TO` values enable optional
new-session alerts; an incomplete set disables alerts.

Before using persistence, review [database/README.md](database/README.md) and
manually apply `database/001_initial.sql` followed by
`database/002_correction_sync.sql` to a **new, empty** Supabase project. For an
existing project, inspect its schema and data, back it up, and prepare an
adoption migration for any differences. The app never runs migrations. The
`npm run db:test` command uses disposable local PostgreSQL only.

To populate a development Pinecone index, first review the source JSON and
run the read-only plan:

```bash
npm run ingest -- --dry-run
npm run ingest
```

Ingestion validates source IDs before provider access. It upserts stable
source-owned IDs before deleting stale IDs with the exact source ownership
marker. It preserves owner correction vectors and legacy unmarked vectors.
The dry run inventories the configured index without embedding or mutation;
it still requires read access to that development index. Review the plan
before any live run. No production re-index was performed for this refactor.

## Verification

```bash
npm run check       # Prettier scope, ESLint, TypeScript, offline Vitest
npm run build       # No AI or database credentials needed
npx playwright install chromium
npm run test:e2e    # Against the production build on local port 3100
npm run db:test     # Disposable Docker PostgreSQL 16, fresh and adoption paths
```

The PDF browser test requires `pdftotext` (Poppler). CI installs Chromium,
Poppler, and a local PostgreSQL container, then runs these same gates from a
clean checkout. Browser chat responses are synthetic fixtures. Vitest suites
reject unmocked external requests. `npm run format` applies Prettier to
maintained source, configuration, and selected documentation; authored JSON,
historical HTML, local files, and generated output are outside that scope.

`npm run eval` performs **live retrieval-recall evaluation**, using the same
retrieval path as chat. It needs provider access and does not verify generated
answer accuracy. Live provider behavior, production persistence, email
delivery, deployment, and production migrations remain unverified by offline
gates.

## Routes and owner workflow

| Route | Purpose |
| --- | --- |
| `/dj` | Profile and streaming chat |
| `/dj/apple-immersive-video` | Apple immersive video work sample |
| `/dj/b2b-saas-km-analysis` | B2B SaaS knowledge-management analysis |
| `/dj/breakout-game-analysis` | Game analysis work sample |
| `/dj/flint-analysis` | Flint retrospective |
| `/admin/dashboard` | Reviews, metrics, corrections, and settings |
| `/admin/internal` | Authenticated retrieval and prompt diagnostics |
| `/admin/capture` | Authenticated interview capture |
| `/v1` | Earlier chat interface |
| `/ui`, `/ui/[name]` | Historical prototype gallery and HTML routes |

Owner sessions use an eight-hour signed cookie (`HttpOnly`, `SameSite=Strict`,
and `Secure` in production). Owner mutations require same-origin requests;
internal chat and capture require a valid session before provider access.
Expiring sessions return to sign-in. The capture and internal pages keep
bounded in-memory drafts through reauthentication; explicit sign-out clears
them. Rate limits are process-local, and deployments must have a trusted
reverse proxy that overwrites `X-Forwarded-For` for per-visitor limiting.

For reviews, the database first saves the review and pending correction under
an atomic owner claim. Only that owner can finalize or release it. A failed
embedding before vector access releases the claim for retry. If a vector
upsert is rejected or times out, the claim remains held because the provider
may still write later. An administrator may clear it only after confirming
that the old worker and provider activity have ended. See
[database/README.md](database/README.md) for recovery details.

Capture exports versioned JSON and versioned labelled text. `npm run
structure -- --input path/to/transcript` accepts those formats, legacy capture
JSON, and Q/A text. Ambiguous `Human`/`Assistant` text requires `--format
capture-legacy`; explicit Q/A mode is `--format qa`. Structuring uses live
generation and may use Pinecone for deduplication. It validates and appends
entries atomically to `data/knowledge_entries.json`; it does not index them.
Review generated facts and duplicates before a development ingestion run.

The conversation PDF exporter uses a bundled Korean-capable font, checks page
boundaries, and preserves English and Korean answer text. Its source and
license are recorded in [public/fonts/README.md](public/fonts/README.md).
Geist fonts are bundled through the `geist` npm package, so production builds
have no font network dependency.

Personal Meta preparation files are intentionally ignored. They can exist in
a local checkout but are absent from a clean Git build; the ignore rules do
not stop a local Next.js server from building or serving those files.
