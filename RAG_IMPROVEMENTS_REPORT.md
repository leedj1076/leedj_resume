# RAG Improvement Report

## Current State Summary

**Pipeline:** User query → embed with `gemini-embedding-001` (3072d) → hybrid Pinecone retrieval (semantic + metadata filter + pinned) → structured context (OVERVIEW / DETAILED STORIES) → `gemini-2.5-flash` streams response.

42 chunks (22 surface, 20 deep_dive). Entity detection triggers company-filtered retrieval. Three chunks are always pinned.

The hybrid retrieval from the last iteration solved the *completeness* problem. The improvements below target 6 deeper layers: **embedding quality, data quality, generation parameters, retrieval refinement, robustness, and UX**.

---

## A. Embedding & Ingestion (the foundation)

### A.1 Add `taskType` to Embedding Calls — Highest-Impact Single Change

**Problem:** Neither ingestion nor query embedding specifies a `taskType`. Google's `gemini-embedding-001` supports asymmetric task types: `RETRIEVAL_DOCUMENT` (optimizes for being *found*) and `RETRIEVAL_QUERY` (optimizes for *finding*). Without these, the model defaults to a generic embedding space that's suboptimal for retrieval.

**Current (`scripts/ingest.ts:51-54`, `app/api/chat/route.ts:36-39`):**
```typescript
// Ingestion — no taskType
await embedMany({ model: google.embedding("gemini-embedding-001"), values: enrichedTexts });

// Query — no taskType
await embed({ model: google.embedding("gemini-embedding-001"), value: query });
```

**Fix:**
```typescript
// Ingestion
await embedMany({
  model: google.embedding("gemini-embedding-001"),
  values: enrichedTexts,
  providerOptions: { google: { taskType: "RETRIEVAL_DOCUMENT" } },
});

// Query
await embed({
  model: google.embedding("gemini-embedding-001"),
  value: query,
  providerOptions: { google: { taskType: "RETRIEVAL_QUERY" } },
});
```

**Impact:** Directly improves retrieval accuracy across ALL queries — semantic search becomes better at matching questions to answers. This is the single most impactful change in this entire report.

**Effort:** 2 lines changed + re-ingest.

---

### A.2 Clean Up Enriched Text Format

**Problem:** Every chunk's enriched text starts with `Context: ... Content: ...` labels. These labels consume embedding dimensions for zero semantic value, and every chunk shares the same prefix tokens, diluting differentiation. They also look like metadata labels when the LLM reads them, rather than natural prose.

**Current (`scripts/ingest.ts:21-34`):**
```
Context: Director, Business & Publishing Division at Devs United Games (2024-02 – 2025-08). [experience]. Content: Increased revenue by 55.47% YoY...
```

**Fix:** Drop labels, use natural prose:
```
Director, Business & Publishing Division at Devs United Games (2024-02 – 2025-08). Increased revenue by 55.47% YoY...
```

**Impact:** Minor but free. Cleaner embeddings, more natural LLM context. Each chunk saves ~5-8 tokens of wasted prefix.

---

### A.3 Store Skills & Keywords as Arrays

**Problem:** `skills` and `keywords` are joined into comma-separated strings during ingestion. Pinecone supports native array metadata with `$in` filtering, but comma-strings can only be exact-matched — useless for filtering.

**Fix (`scripts/ingest.ts:96-97`):**
```typescript
skills: entry.skills,       // was: entry.skills.join(", ")
keywords: entry.keywords,   // was: entry.keywords.join(", ")
```

**Impact:** Unlocks skill-based and keyword-based metadata filtering for future retrieval strategies (see C.5).

---

### A.4 Consider Reducing Embedding Dimensions

**Problem:** 3072 dimensions for 42 chunks is significant overhead. Research shows `gemini-embedding-001` at 768 dimensions has only 0.26% quality loss on benchmarks, and 1536 achieves identical MTEB scores to 3072.

**Fix:** Pass `outputDimensionality: 768` (or 1536) via `providerOptions`. Requires L2 normalization since sub-3072 outputs aren't pre-normalized.

**Impact:** 75% storage reduction, faster embedding latency. Low priority — the quality difference is negligible at this scale, and the implementation requires normalization code.

---

## B. Data Quality (the chunks themselves)

### B.1 Eliminate Redundant Narrative Chunks

**Problem:** 5 narrative chunks (`narrative-career-trajectory`, `narrative-partnership-expertise`, `narrative-technical-background`, `narrative-startup-founder`, `narrative-spatial-computing`) are 80-100% redundant with existing experience chunks. They collectively consume ~457 tokens of context while adding nearly zero unique information.

**Examples of verbatim overlap:**
- `narrative-startup-founder` repeats every fact from `exp-flint-overview` + `exp-flint-fundraising` + `exp-flint-ai-tech`
- `narrative-spatial-computing` repeats every fact from `exp-dug-partnerships` + `exp-dug-apple-spatial` + `exp-dug-revenue`
- `narrative-career-trajectory` restates the entire career arc already covered by all overview chunks

**Impact:** Redundant chunks cause two problems: (1) retrieval returns repetitive results that waste context slots, and (2) the LLM may cite the vague narrative summary instead of the specific experience chunk.

**Fix:** Delete `narrative-startup-founder`, `narrative-spatial-computing`, and `narrative-technical-background`. Keep `narrative-career-trajectory` (useful as a structural anchor) and `narrative-partnership-expertise` (the "deal cycle" and "partner-centric perspective" sentences are marginally unique). This removes 3 chunks and ~280 tokens of noise.

---

### B.2 Split the Dual-Topic Chunk

**Problem:** `story-cs-rag-implementation` merges two unrelated subjects: (1) DUG customer service automation with ChatGPT, and (2) a personal whiskey recommender RAG project. They have different company associations, different sections, and different use cases. The current metadata (`section: "project"`, `company: null`) is wrong for the DUG portion.

**Fix:** Split into two chunks:
- `story-dug-cs-automation` — DUG CS work, `company: "Devs United Games"`, `section: "experience"`, `depth: "deep_dive"`
- `story-whiskey-rag-project` — personal project, `company: null`, `section: "project"`, `depth: "deep_dive"`

Also resolves ~75% overlap with the existing `project-whiskey-rag` chunk.

---

### B.3 Delete or Rewrite `exp-flint-ai-tech`

**Problem:** At 44 tokens, this is the weakest chunk. It says the same thing twice in two sentences:
> "developed an AI-driven recommendation engine using Graph Neural Networks for intelligent knowledge management. The startup's product was an intelligent knowledge management tool utilizing Graph Neural Network technology..."

This content is covered far more thoroughly in `story-flint-product-concept` and `story-flint-gnn-technical`.

**Fix:** Delete entirely.

---

### B.4 Fix Metadata Inconsistencies

| Chunk | Issue | Fix |
|-------|-------|-----|
| `exp-kit-research` | `company: "Institute of Microstructure Technology, KIT"` — inconsistent with `edu-kit-dual-degree` which uses `"KIT"` | Change to `"KIT"` |
| `honors-awards` | `section: "skills"` — awards are not skills | Change to `"awards"` or `"honors"` |
| `story-partnership-negotiation-philosophy` | `section: "leadership"` — all other DUG stories use `"experience"` | Change to `"experience"` |
| `story-partnership-negotiation-philosophy` | `keywords` includes `"conflict resolution"` but text never describes resolving a conflict | Remove the keyword |

---

### B.5 Content Gaps — Common Recruiter Questions with Zero Coverage

| Missing Topic | Why It Matters |
|---|---|
| **Career goals / what he's looking for next** | First thing recruiters want to know |
| **Team sizes managed** | No chunk states how many people he managed at any company |
| **Why Flint ended** | The startup existed 2021-2024 and he moved on — no explanation |
| **Current availability** | Left DUG Aug 2025, no statement of availability |
| **Management style** | How he leads direct reports, gives feedback, runs teams |
| **Military service (standalone)** | Buried in `exp-tmax-team-lead` as one line — Korean recruiters will specifically ask |
| **Failure/setback stories** | The Meta walkaway and GNN friction are close but not explicitly framed as lessons |

**Fix:** Add 3-5 new chunks covering the highest-value gaps. Even short chunks (50-60 tokens) for career goals, availability, and team sizes would dramatically improve answers to these common questions.

---

### B.6 Coverage Imbalance Across Companies

| Company | Surface | Deep Dive | Total | Tenure |
|---------|---------|-----------|-------|--------|
| Devs United Games | 6 | 6 | 12 | 1.5 years |
| Flint Technologies | 5 | 5 | 10 | 2.8 years |
| TmaxTibero | 3 | 2 | **5** | **3.3 years** |
| KIT | 1 | 0 | **1** | 1 year |
| KAIST | 2 | 0 | **2** | 8 years |

TmaxTibero has the longest tenure but the fewest chunks. KIT and KAIST have zero deep dives.

**Fix:** Add 2-3 deep dives for TmaxTibero (autonomous database project, promotion story) and 1 for KIT (thesis/research specifics).

---

## C. Retrieval Logic

### C.1 Conversational Query Reformulation

**Problem:** Only the last user message is embedded for retrieval. Follow-ups like *"How did you handle that?"* or *"Tell me more"* produce vague embeddings.

```
User: "What did you do at DUG?"        → retrieves DUG chunks ✅
User: "Tell me about the Apple deal"   → retrieves Apple chunks ✅
User: "How did you negotiate that?"    → retrieves random chunks ❌
```

**Fix (Option A — zero latency):** Concatenate the last assistant message (truncated to ~100 words) + current user message as the embedding input.

**Fix (Option B — higher quality, +200ms):** Fast LLM call to rewrite the follow-up into a standalone query: *"How did you negotiate that?"* → *"How did Dong Jae Lee negotiate the Apple Vision Pro partnership at Devs United Games?"*

**Impact:** Fixes all pronoun/follow-up queries. The single biggest gap in retrieval quality.

---

### C.2 Remove DUG Bias from Pinned Chunks

**Problem:** `exp-dug-overview` is always pinned. A question about Flint wastes a context slot on DUG material and subtly biases the LLM.

**Fix:** Remove it from static pinned list. Keep only `narrative-career-trajectory` and `personal-summary`.

---

### C.3 Extend Entity Detection to Sections and Education

**Problem:** Entity detection only handles 3 companies. Queries about education, awards, or KAIST/KIT don't trigger metadata filtering.

**Fix:** Return a broader filter type:
```typescript
"education" / "학력" / "degree" → section filter: "education"
"kaist" / "카이스트" → company filter: "KAIST"
"kit" / "karlsruhe" → company filter: "KIT"
"award" / "수상" → section filter: "awards"
```

---

### C.4 Dynamic Pinning Based on Detected Entity

**Fix:** Pin each company's overview chunk when that company is detected, instead of always pinning DUG's:
```typescript
if (detectedCompany === "Devs United Games") pin("exp-dug-overview");
if (detectedCompany === "Flint Technologies") pin("exp-flint-overview");
if (detectedCompany === "TmaxTibero") pin("exp-tmax-team-lead");
```

---

### C.5 Reranking

**Problem:** Semantic similarity ≠ query-answer relevance. Cross-cutting queries suffer most.

**Fix:** Use Pinecone's built-in reranker on the semantic search path:
```typescript
ns.query({ vector: embedding, topK: 15, rerank: { model: "pinecone-rerank-v0", topN: 8, rankFields: ["enrichedText"] } });
```

**Tradeoff:** +50-100ms latency. Worth it.

---

### C.6 Temporal Query Handling

**Problem:** *"What were you doing in 2020?"* relies on embedding similarity for dates, which is unreliable.

**Fix:** Detect year mentions and use date-range metadata filtering:
```typescript
const yearMatch = query.match(/\b(20[12]\d)\b/);
// filter: start_date <= "YYYY-12" AND end_date >= "YYYY-01"
```

---

## D. Generation Parameters

### D.1 Set Temperature — Currently Default 1.0

**Problem:** No `temperature` is specified. Gemini 2.5 Flash defaults to 1.0, which introduces unnecessary randomness for a factual resume Q&A. Answers vary significantly between identical queries.

**Fix:**
```typescript
streamText({
  model: google("gemini-2.5-flash"),
  temperature: 0.3,  // grounded but not robotic
  ...
});
```

**Impact:** More consistent, factually grounded responses. The "warm, conversational" tone from the system prompt still works fine at 0.3.

---

### D.2 Set maxTokens — Currently Unbounded

**Problem:** No `maxTokens` is set. Gemini 2.5 Flash can generate up to ~65K tokens. A complex question could produce an extremely long response — bad UX, higher cost, longer streaming time.

**Fix:**
```typescript
streamText({
  maxTokens: 1024,  // sufficient for 4-6 bullet points + follow-up depth
  ...
});
```

---

### D.3 Conversation History — Unbounded Growth

**Problem:** The entire conversation history is sent to the LLM on every request (`convertToModelMessages(messages)` with no truncation). By turn 15, you're re-sending all 15 turns of context. This increases cost linearly and can dilute the LLM's attention away from the resume context.

**Fix:** Slice to the last N messages server-side:
```typescript
const MAX_HISTORY = 10; // 5 exchanges
const recentMessages = messages.slice(-MAX_HISTORY);
const modelMessages = await convertToModelMessages(recentMessages);
```

---

### D.4 Pass `abortSignal` for Stream Cancellation

**Problem:** No `abortSignal` is passed to `streamText`. If the user navigates away or the connection drops, the server continues consuming Gemini API tokens until the full response is generated.

**Fix:**
```typescript
const result = streamText({
  abortSignal: req.signal,
  ...
});
```

**Effort:** 1 line.

---

## E. System Prompt

### E.1 Conflicting Comprehensiveness vs. Brevity Instructions

**Problem:** The prompt says both:
- *"Give a comprehensive overview (4-6 bullet points covering ALL major aspects)"*
- *"Use short paragraphs — never a wall of text"*

These pull in opposite directions. The LLM oscillates between verbose comprehensive responses and terse bullet lists.

**Fix:** Align them: *"3-5 concise bullet points highlighting the most impressive achievements"* — this is both complete and brief.

---

### E.2 Follow-Up vs. New Topic Detection Is Fragile

**Problem:** The LLM is responsible for deciding whether a question is a follow-up or new topic via free-text instructions. This is inherently unreliable — ambiguous queries like *"What about your management experience?"* get classified inconsistently, especially at temperature 1.0.

**Fix:** Move topic detection server-side. Compute cosine similarity between current query embedding and previous query embedding. If similarity > 0.7, inject `[CONTEXT: This is a follow-up to the previous topic]` into the prompt. If < 0.4, inject `[CONTEXT: This is a new topic]`. This gives the LLM a deterministic signal instead of requiring it to guess.

---

### E.3 The "Context: ... Content: ..." Labels in LLM Context

**Problem:** The LLM receives chunks like:
```
Context: Director at Devs United Games (2024-02 – 2025-08). [experience]. Content: Led partnership...
```

The `Context:` and `Content:` labels look like metadata scaffolding, not natural text. The LLM sometimes echoes these labels or treats the metadata prefix as less important than the content.

**Fix:** Same as A.2 — clean up the enriched text format. Natural prose reads better for both embeddings and LLM consumption.

---

## F. Robustness & Error Handling

### F.1 Zero Error Handling in API Route — Critical

**Problem:** `app/api/chat/route.ts` has no `try/catch`. If Pinecone is down, the embedding API fails, or `req.json()` is malformed, the error propagates as an unhandled 500. The frontend has no `onError` handler and never checks `status === "error"`, so the user sees *"Thinking..."* disappear with zero feedback.

**Fix:**
```typescript
export async function POST(req: Request) {
  try {
    // ... existing logic
  } catch (error) {
    console.error("[RAG] Error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

Plus on the frontend, handle the error state:
```typescript
const { messages, sendMessage, status, error } = useChat({
  onError: (err) => console.error("Chat error:", err),
});

// In JSX: render error message when status === "error"
```

---

### F.2 No Input Validation

**Problem:** No validation of the user's message. An empty string gets embedded (wasting an API call) and searched. A 10,000-word message could exceed the embedding model's token limit and throw an uncaught error.

**Fix:** Early return for empty queries, truncate long queries before embedding:
```typescript
if (!query.trim()) {
  return new Response(JSON.stringify({ error: "Empty message" }), { status: 400 });
}
const truncatedQuery = query.slice(0, 2000); // embedding model limit safety
```

---

### F.3 No Rate Limiting

**Problem:** The `/api/chat` endpoint is completely open. No rate limiting, no session limits, no IP throttling. Anyone can send unlimited requests, burning through Google API credits and Pinecone quotas.

**Fix:** Add basic rate limiting via middleware or an in-memory store. For a personal resume site, even a simple approach works:
```typescript
// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;
```

---

### F.4 No Route Timeout

**Problem:** No `maxDuration` is configured. On Vercel Hobby, the default is 10 seconds — which may not be enough for embedding + 3 Pinecone queries + Gemini streaming. On self-hosted, there's effectively no timeout.

**Fix:**
```typescript
// app/api/chat/route.ts
export const maxDuration = 30; // seconds
```

---

## G. Frontend UX

### G.1 No Auto-Scroll

**Problem:** The message area is `overflow-y-auto` but there's no `scrollIntoView` when new messages arrive. After several exchanges, the user must manually scroll down.

**Fix:** Add a `useEffect` that scrolls to bottom when `messages` changes:
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```

---

### G.2 No Error State in UI

**Problem:** If the API returns an error, the user sees "Thinking..." vanish with no explanation. The `useChat` hook provides `error` and `status === "error"` but neither is used.

**Fix:** Render an error message with a retry option when `status === "error"`.

---

### G.3 Suggested Questions Don't Showcase Hybrid Retrieval

**Problem:** None of the 4 suggested questions name a specific company, so they never trigger the company-filtered retrieval path — the main differentiator of the system.

**Fix:** Replace one suggestion with a company-specific question:
```typescript
"What did you do at Devs United Games?"  // triggers hybrid retrieval
```

---

### G.4 No "Stop Generating" Button

**Problem:** `useChat` provides a `stop()` function, but it's not exposed to the user. Long streaming responses can't be interrupted.

**Fix:** Show a stop button when `status === "streaming"`.

---

### G.5 `<html lang="en">` Hardcoded

**Problem:** `app/layout.tsx` hardcodes `<html lang="en">` even though the app supports Korean. This affects accessibility and SEO.

**Fix:** Either set `lang="en"` dynamically based on detected language, or use a neutral value like `lang="mul"` (multilingual).

---

## H. Debug & Evaluation

### H.1 Add Retrieval Logging (Dev Mode)

```typescript
if (process.env.NODE_ENV === "development") {
  console.log("[RAG] Query:", query);
  console.log("[RAG] Company:", detectedCompany);
  console.log("[RAG] Chunks:", [...chunks.keys()]);
  console.log("[RAG] Overview:", overviewChunks.length, "Deep:", deepDiveChunks.length);
}
```

---

### H.2 Evaluation Test Suite

Create `scripts/eval.ts` with query → expected chunk IDs to prevent regressions:
```typescript
const TEST_CASES = [
  { query: "What did you do at DUG?", mustInclude: ["exp-dug-overview", "exp-dug-partnerships", ...] },
  { query: "Tell me about your education", mustInclude: ["edu-kaist-masters", "edu-kaist-bachelors", "edu-kit-dual-degree"] },
  { query: "What AI tools have you used?", mustInclude: ["exp-dug-ai-ops", "story-cs-rag-implementation"] },
];
```

---

## Not Recommended (Evaluated and Rejected)

| Approach | Why Not |
|----------|---------|
| HyDE (Hypothetical Document Embeddings) | +500-1000ms latency. Overkill for 42 chunks. |
| Fine-tuned embedding model | 42 chunks is far too few. Would overfit immediately. |
| Multiple Pinecone indexes | Operational complexity, no benefit at this scale. |
| Agentic RAG with tool calling | Over-engineered for a resume chatbot. |
| Parent-child chunking | Surface/deep_dive split already serves this purpose. |
| Reducing dimensions (A.4) | Marginal benefit, requires normalization code. Low priority. |

---

## Implementation Order

```
Phase 1 — Trivial changes, immediate impact (~30 min):
  A.1  Add taskType to embeddings + re-ingest          ← BIGGEST SINGLE WIN
  D.1  Set temperature: 0.3
  D.2  Set maxTokens: 1024
  D.4  Pass abortSignal
  C.2  Remove DUG bias from pinned chunks
  H.1  Add dev-mode retrieval logging

Phase 2 — Small code changes (~1-2 hours):
  F.1  Add try/catch + frontend error state
  F.2  Input validation
  A.2  Clean up enriched text format + re-ingest
  A.3  Store skills/keywords as arrays + re-ingest
  D.3  Conversation history sliding window
  G.1  Auto-scroll
  E.1  Fix prompt comprehensiveness/brevity tension

Phase 3 — Meaningful logic changes (~2-3 hours):
  C.1  Conversational query reformulation
  C.3  Extend entity detection (sections, education)
  C.4  Dynamic pinning
  C.5  Reranking
  E.2  Server-side follow-up detection

Phase 4 — Data work (~1-2 hours):
  B.1  Remove redundant narrative chunks
  B.2  Split dual-topic chunk
  B.3  Delete exp-flint-ai-tech
  B.4  Fix metadata inconsistencies
  B.5  Add missing gap chunks (career goals, team sizes, etc.)
  B.6  Add TmaxTibero/KIT deep dives

Phase 5 — Polish:
  C.6  Temporal query handling
  F.3  Rate limiting
  F.4  Route timeout
  G.2-G.5  Frontend UX polish
  H.2  Evaluation test suite
```

---

## Expected Outcome Summary

| Category | Before | After All Phases |
|---|---|---|
| **Retrieval accuracy** | Good for company queries, weak for follow-ups and cross-cutting | Strong across all query types |
| **Response consistency** | Varies significantly (temp 1.0, no maxTokens) | Consistent tone and length |
| **Error resilience** | Silent failures, no user feedback | Graceful degradation with error messages |
| **Data completeness** | 5 redundant chunks, gaps on career goals/team sizes | Clean, non-redundant, covers all recruiter questions |
| **Follow-up handling** | Depends on LLM guessing topic continuity | Server-side detection with embedding similarity |
| **Embedding quality** | Generic task type, diluted by labels | Asymmetric RETRIEVAL_DOCUMENT/QUERY, clean text |
| **Cost efficiency** | Unbounded history, no abort, no rate limit | Sliding window, abort signal, rate limited |
