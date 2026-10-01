# Architecture

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
