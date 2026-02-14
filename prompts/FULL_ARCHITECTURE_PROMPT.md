Act as a Principal Full-Stack AI Engineer and RAG Architect. I am building **"Ask DJ"** — a shareable AI knowledge base where VCs, corporate strategy teams, business development leads, and hiring managers can chat with an AI that deeply knows my professional experience. Think of it as a living, conversational portfolio that goes far beyond a static resume.

The system has **3 remaining phases** (Phase 3 — Visitor Chat — is already complete and deployed):

1. **Knowledge Capture** — An AI interviews me on Claude App, then a structuring script converts transcripts to indexed entries.
2. **Knowledge Indexing** — Structured entries are embedded and stored alongside existing resume chunks with rich metadata.
3. **Analytics & Feedback** — Tracks what visitors ask, which topics perform well, and where knowledge gaps exist.

> **Phase 3 (Visitor Chat)** is complete: Gateway Modal, persona-aware retrieval + re-ranking, dynamic system prompt with persona tone + focus highlighting, cold-start welcome, bilingual support, feedback buttons, settings reset, privacy guardrails, rate limiting. See committed code for reference.

---

## TECH STACK & CONSTRAINTS (Match Existing Codebase)

| Layer             | Technology                                            |
|-------------------|-------------------------------------------------------|
| Framework         | **Next.js 16.1.6** (App Router)                       |
| React             | **React 19.2.4**                                      |
| Chat SDK          | **Vercel AI SDK v6.0+** (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) |
| Styling           | **Tailwind CSS 4** + `@tailwindcss/typography`         |
| Vector DB         | **Pinecone 7.0** (free tier: 1 index, 100K vectors, serverless AWS us-east-1) |
| Embedding model   | **`gemini-embedding-001`** (3072 dims, task type: `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`) |
| LLM (generation)  | **`gemini-2.5-flash`** for chat (via `@ai-sdk/google`) |
| LLM (capture)     | **`gemini-2.5-flash`** for in-app interviews, **Claude** on Claude App (alternative) |
| LLM (structuring) | **`gemini-2.0-flash`** for post-processing (cheaper)   |
| Markdown render   | **`react-markdown` 10.1**                              |
| Hosting           | **Vercel** (hobby plan)                                |
| Analytics store   | Server-side structured logging → Vercel Log Drain      |
| Auth              | None (public link) — rate limit by IP                  |
| Script runner     | **`tsx`** (for ingest/eval/structure scripts via `--env-file=.env.local`) |

### Existing Environment Variables (.env.local)
```
GOOGLE_GENERATIVE_AI_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=resume-rag
ADMIN_PASSWORD=...           # Password for /admin/capture page
```

### Vercel Constraints (Design Around These)
- Current route already sets `export const maxDuration = 30` — this works on Vercel Pro/Hobby for streaming.
- Pinecone index: `resume-rag`, namespace: `resume`, dimension: **3072**, metric: cosine.
- No persistent server — all state in Pinecone or client-side.

### Existing Patterns to PRESERVE (Do Not Replace)
These patterns are already working in production. The architecture must build on top of them, not discard them:

1. **Entity detection (`lib/entity-detection.ts`)** — Zero-latency regex-based keyword→filter mapping for companies (EN + KR aliases), sections, temporal ranges, and recency.

2. **Pinned chunks** — `narrative-career-trajectory` and `personal-summary` are always fetched and included. Company overview chunks are dynamically pinned when a company is detected.

3. **Parallel retrieval** — Semantic search + entity-filtered search + focus-filtered search + pinned fetch run as `Promise.all()`.

4. **Context stratification** — Chunks have `depth: "surface" | "deep_dive"`. The context block separates OVERVIEW from DETAILED STORIES.

5. **Conversation-aware retrieval** — `buildRetrievalQuery()` prepends the last assistant message for better follow-up embedding.

6. **Bilingual support (EN / KO)** — The UI has full i18n with a language toggle. The system prompt detects language and responds in kind.

7. **In-memory rate limiting** — `Map<string, {count, resetAt}>` per IP, 15 req/min.

8. **Streaming via `streamText()`** — Uses `result.toUIMessageStreamResponse()`. The `useChat` hook from `@ai-sdk/react` with `sendMessage()` pattern.

9. **Gateway Modal + Persona-Aware RAG** — `WelcomeModal` captures persona + focus. `DefaultChatTransport` with `body` function injects visitorData per-request. Dynamic system prompt with persona tone + focus highlighting. Persona-aware re-ranking via `scoreChunk()`.

10. **Feedback Buttons** — Thumbs up/down on each assistant message with one-click lock.

---

# PHASE 1: KNOWLEDGE CAPTURE (Private, DJ-Facing)

## Purpose
Capture **200+ detailed Q&A entries** that represent how DJ would answer in a real interview — in his own voice, with specifics. Two capture methods are available: an in-app admin page and a Claude App project prompt.

## 1A. The Interview Admin Page (`/admin/capture`) — IMPLEMENTED

A private page at `/admin/capture` protected by `ADMIN_PASSWORD` env variable. The page is a full-screen chat interface where the AI interviews DJ using `gemini-2.5-flash`.

### Features
- **Password gate:** Compares input against `ADMIN_PASSWORD` env var. Stored in sessionStorage after first successful auth.
- **Interview system prompt:** Structured interviewer that covers roles, projects, technical deep-dives, behavioral stories, skills, career narrative, and industry insights. Asks 5-8 progressively deeper questions per topic. Never accepts vague answers. Tracks a recruiter checklist (metrics, team size, technologies, challenges, outcomes).
- **Already-captured awareness:** The system prompt lists all existing indexed entries to avoid redundancy, and prioritizes known gaps (behavioral stories, Flint deeper, TmaxTibero deeper, technical depth, industry insights, career transitions, soft skills).
- **Session management:**
  - "Save .txt" button — downloads transcript as `Human:/Assistant:` text file (ready for `scripts/structure.ts`)
  - "Save .json" button — downloads transcript as JSON array of `{role, content}` objects
  - Textarea input with Shift+Enter for multiline answers
  - "Start Interview" button sends initial message to trigger the topic menu
- **API route:** `/api/capture` — streams responses via `streamText()`, validates password on every request.

### Workflow
1. Navigate to `/admin/capture` and enter the admin password
2. Click "Start Interview" or type to begin
3. Answer the AI's questions in detail
4. Click "Save .txt" to download the transcript
5. Run `npm run structure -- --input path/to/capture-YYYY-MM-DD.txt`
6. Review entries in `data/knowledge_entries.json`
7. Run `npm run ingest` to re-index with new entries

### Alternative: Claude App Interview
A separate prompt file (`prompts/phase1a-interview.md`) is also available for conducting interviews directly on Claude App with the full Claude LLM. Same workflow — save transcript, run `structure.ts`.

## 1B. The Structuring Pipeline (`scripts/structure.ts`) — IMPLEMENTED

**Already created:** `scripts/structure.ts`

The pipeline:
1. **Parses** raw transcripts into Q&A exchanges (supports `Human:/Assistant:`, `Q:/A:` formats, or single-block fallback)
2. **Structures** each exchange via `gemini-2.0-flash` + `generateObject()` with Zod schema validation
3. **Validates** output against strict schema (chunk_id format, section enum, focus_tags enum, date format)
4. **Computes** token count for each entry
5. **Deduplicates** against existing entries (>0.90 cosine similarity via Pinecone query, skippable with `--skip-dedup`)
6. **Appends** to `data/knowledge_entries.json`
7. **Reports** session results (entries captured, sections, focus areas, duplicates, failures)

### Output Schema (compatible with `resume.json`)
```typescript
{
  chunk_id: string,        // lowercase slug with hyphens
  question: string,        // canonical recruiter question this answers
  answer_summary: string,  // dense 1-2 sentence summary for retrieval
  text: string,            // full answer in third person (150-400 tokens)
  source_type: "qa_story",
  section: "experience" | "skills" | "project" | "education" | "leadership" | "awards" | "narrative" | "stories" | "summary",
  company: string | null,
  role: string | null,
  start_date: "YYYY-MM" | null,
  end_date: "YYYY-MM" | null,
  skills: string[],
  keywords: string[],
  token_count: number,     // computed after generation
  depth: "surface" | "deep_dive",
  focus_tags: ("business_development" | "ai_llms" | "leadership_strategy" | "full_stack")[],
  is_core_strength: boolean,
}
```

### Usage
```bash
npm run structure -- --input data/capture/session-2026-02-14.txt
npm run structure -- --input data/capture/session-2026-02-14.txt --skip-dedup
```

---

# PHASE 2: KNOWLEDGE INDEXING (Automated Pipeline)

## Purpose
Take all knowledge entries (both existing `resume.json` and new `knowledge_entries.json`) and index them in Pinecone with rich metadata. This extends the existing `scripts/ingest.ts`.

## 2A. Unified Ingestion (Extend `scripts/ingest.ts`)

The existing `ingest.ts` already handles resume.json correctly. Extend it to also read `knowledge_entries.json`:

### Source 1: Resume Chunks (existing — `data/resume.json`)
These are the existing 39 chunks. Indexed exactly as today:
- Chunk ID = `chunk_id` from JSON
- Embedding of `buildEnrichedText()` (role + company + dates + text)
- Metadata: `section`, `company`, `role`, `start_date` (numeric YYYYMM), `end_date`, `skills`, `keywords`, `depth`, `focus_tags`, `is_core_strength`, `enrichedText`

### Source 2: Q&A Entries (new — `data/knowledge_entries.json`)
For each Q&A entry, create a **single vector** (same approach as resume chunks):
- Chunk ID = `chunk_id` from JSON
- Embedding of `buildEnrichedText()` (role + company + dates + text)
- Metadata: same fields as resume chunks, plus `question`, `answer_summary`, `chunk_type: "qa_story"`

**Why single vector (not parent-child)?**
At this scale (<500 entries), both summaries and full texts are short enough (50-400 tokens) that embedding the enriched full text gives good retrieval. The `answer_summary` is stored as metadata for potential future use (e.g., display snippets) but doesn't need its own vector. This keeps the indexing simple and avoids the complexity of detail hydration in the API route. If retrieval quality degrades as the knowledge base grows, parent-child can be added later.

### Updated `buildEnrichedText()` for Q&A entries
```typescript
function buildEnrichedText(entry: ResumeEntry | QAEntry): string {
  const parts: string[] = [];
  if (entry.role) parts.push(entry.role);
  if (entry.company) parts.push(`at ${entry.company}`);
  if (entry.start_date || entry.end_date) {
    const dates = [entry.start_date, entry.end_date].filter(Boolean).join(" – ");
    parts.push(`(${dates})`);
  }
  const prefix = parts.length > 0 ? `${parts.join(" ")}. ` : "";

  // For Q&A entries, prepend the question for better retrieval matching
  const questionPrefix = "question" in entry && entry.question
    ? `Q: ${entry.question}. `
    : "";

  return `${prefix}${questionPrefix}${entry.text}`;
}
```

### Metadata for Q&A vectors
```typescript
{
  id: entry.chunk_id,
  values: embedding,
  metadata: {
    section: entry.section,
    company: entry.company ?? "",
    role: entry.role ?? "",
    start_date: entry.start_date ? dateToNum(entry.start_date) : 0,
    end_date: entry.end_date ? dateToNum(entry.end_date) : 0,
    skills: entry.skills,
    keywords: entry.keywords,
    depth: entry.depth,
    focus_tags: entry.focus_tags,
    is_core_strength: entry.is_core_strength,
    chunk_type: "qa_story",
    question: entry.question ?? "",
    answer_summary: entry.answer_summary ?? "",
    enrichedText: buildEnrichedText(entry),
  }
}
```

## 2B. Coverage Gap Report

After indexing, output a report showing knowledge base coverage:

```
Indexed 39 resume chunks + 45 Q&A entries = 84 vectors total.

Coverage by section:
  experience: 28 entries (15 resume + 13 qa)
  skills: 3 entries (2 resume + 1 qa)
  project: 2 entries (1 resume + 1 qa)
  education: 3 entries (3 resume + 0 qa)  ⚠️ Recommend 3+ Q&A entries
  leadership: 1 entries (1 resume + 0 qa) ⚠️ Recommend 3+ Q&A entries
  awards: 1 entries (1 resume + 0 qa)
  narrative: 2 entries (2 resume + 0 qa)
  stories: 0 entries                      ⚠️ Recommend 5+ Q&A entries
  behavioral: 0 entries                   ⚠️ Recommend 10+ Q&A entries

Coverage by focus:
  business_development: 22 entries
  ai_llms: 8 entries
  leadership_strategy: 12 entries
  full_stack: 9 entries

Core strengths: 6 entries marked is_core_strength
```

This directly tells DJ which topics to prioritize in the next Phase 1A interview session.

## 2C. What We Intentionally Skip (for now)

These features from the original plan are deferred until the knowledge base exceeds 200 entries:

1. **Parent-child chunking** — Not needed at <500 entries. Single vector per entry is simpler and sufficient.
2. **Cross-referencing (related_entries)** — Pinecone semantic search already finds related content at query time. No need to precompute.
3. **Automated core strengths computation** — `CORE_STRENGTH_IDS` in `lib/persona-config.ts` is manually curated and more accurate than frequency-based computation at this scale.

### When to revisit
- **200+ Q&A entries**: Consider parent-child if retrieval precision drops (short summaries embed differently than long texts at scale)
- **500+ entries**: Consider cross-referencing for "Related topics" UI feature
- **Pinecone approaching limits**: Consider deduplication at the vector level

## 2D. Implementation Steps

1. **Extend `scripts/ingest.ts`** (~30 lines changed):
   - Read `data/knowledge_entries.json` if it exists
   - Add Q&A entry interface extending `ResumeEntry` with `question`, `answer_summary`
   - Update `buildEnrichedText()` to handle Q&A entries (prepend question)
   - Add `chunk_type`, `question`, `answer_summary` to upsert metadata
   - Embed all entries together (resume + Q&A) in one `embedMany` call
   - Output coverage gap report

2. **Add to `package.json`** (already done):
   ```json
   "structure": "tsx --env-file=.env.local scripts/structure.ts"
   ```

---

# PHASE 4: ANALYTICS & FEEDBACK (Recruiter Intelligence)

## Purpose
Track what recruiters ask, which knowledge entries get surfaced, and where the system performs well or poorly — while respecting visitor privacy.

## 4A. Server-Side Structured Logging (V1 — Already Partially Implemented)

The API route (`app/api/chat/route.ts`) already logs structured analytics server-side:
```typescript
logAnalytics({
  type: "query",
  query: truncatedQuery.slice(0, 200),
  persona, focus,
  chunksRetrieved: chunks.size,
  chunksAfterRerank: rankedChunks.length,
  timestamp: new Date().toISOString(),
});
```

These logs appear in Vercel server logs with `[ANALYTICS]` prefix, capturable via Vercel Log Drain.

### Current Gap: Client-Side Feedback Not Reaching Server

The `FeedbackButtons` component calls `logAnalytics()` from `lib/analytics.ts`, but this runs in the browser (`console.log` goes to browser DevTools, not Vercel server logs). Feedback data is lost.

**Fix:** Add a lightweight `/api/feedback` route that receives feedback and logs it server-side.

## 4B. Feedback API Route (`app/api/feedback/route.ts`)

```typescript
// NEW file: app/api/feedback/route.ts
import { logAnalytics } from "@/lib/analytics";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messageId, value, persona, focus, sessionId } = body;

    if (!messageId || !["up", "down"].includes(value)) {
      return new Response(JSON.stringify({ error: "Invalid feedback" }), { status: 400 });
    }

    logAnalytics({
      type: "feedback",
      messageId,
      value,
      persona: persona ?? "unknown",
      focus: focus ?? "unknown",
      sessionId: sessionId ?? "unknown",
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
}
```

### Updated Client-Side Feedback Handler (in `page.tsx`)
```typescript
function handleFeedback(messageId: string, value: "up" | "down") {
  // Fire-and-forget POST to server
  fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messageId,
      value,
      persona: visitorData?.persona,
      focus: visitorData?.focus,
      sessionId, // generated on modal submit
    }),
  }).catch(() => {}); // silent failure — analytics is best-effort
}
```

## 4C. Privacy-Safe Logging

### What We Log (server-side, Vercel server logs only)
| Event | Data Logged | Data NOT Logged |
|-------|-------------|-----------------|
| `session_start` | persona, focus, lang, timestamp | IP address, user agent |
| `query` | truncated query (first 200 chars), persona, focus, chunk IDs retrieved, chunk count | Full query if >200 chars |
| `feedback` | messageId, up/down, persona, focus, sessionId | Message content |

### What We Do NOT Log
- **IP addresses** — not needed for knowledge gap analysis
- **Full message content** — truncated to 200 chars, enough to identify topic patterns
- **User agent / device info** — not useful for improving the knowledge base
- **Session linkage** — sessionId is a random UUID, not tied to any user identity

### Privacy Notice (in WelcomeModal)
Add a small note below the "Start Chat" button:
```
en: "Your questions help improve this AI. No personal data is collected."
ko: "질문은 AI 개선에 활용됩니다. 개인정보는 수집하지 않습니다."
```

## 4D. Data Model

```typescript
interface AnalyticsEvent {
  type: "session_start" | "query" | "init" | "feedback";
  timestamp: string;
  // Session context
  persona?: string;
  focus?: string;
  lang?: string;
  sessionId?: string;
  // For "query" events
  query?: string;              // truncated to 200 chars
  chunksRetrieved?: number;
  chunksAfterRerank?: number;
  // For "feedback" events
  messageId?: string;
  value?: "up" | "down";
}
```

## 4E. Knowledge Gap Detection (Manual V1)

Periodically review Vercel logs (or Log Drain export) for:

1. **Unanswered queries** — queries where the system responded with "That's not something covered in my background" indicate gaps in the knowledge base. Capture these topics in the next Phase 1A session.

2. **Low chunk counts** — queries where `chunksRetrieved` is very low (<3) suggest the topic has poor coverage.

3. **Thumbs-down patterns** — cluster negative feedback by persona/focus to identify which visitor types are underserved.

4. **High-frequency topics** — if many visitors ask about a topic (e.g., "AI experience"), ensure deep coverage (multiple deep_dive entries with metrics).

### Actionable Feedback Loop
```
Vercel Logs → Identify gaps → Phase 1A interview session → structure.ts → ingest.ts → Better retrieval
```

## 4F. V2 Improvements (Future)

When analytics volume justifies it:
1. **Vercel KV storage** — persist analytics events in Redis for programmatic access
2. **Admin dashboard** (`/admin/analytics`) — visualize query patterns, feedback rates, coverage gaps
3. **Automated gap reports** — weekly digest of underserved topics
4. **A/B testing** — compare persona prompt variations by feedback rate

---

# FILE STRUCTURE

```
app/
├── page.tsx                          # Public chat page (DONE — WelcomeModal + visitorData + feedback)
├── components/
│   ├── WelcomeModal.tsx              # DONE — Gateway modal + privacy notice
│   ├── FeedbackButtons.tsx           # DONE — Thumbs up/down
│   └── SkeletonLoader.tsx            # DONE — Cold start loading state
├── admin/
│   └── capture/
│       └── page.tsx                  # DONE — Password-protected interview capture UI
├── layout.tsx                        # KEEP — existing root layout
├── globals.css                       # KEEP — existing Tailwind imports
├── api/
│   ├── chat/
│   │   └── route.ts                  # DONE — persona-aware retrieval, dynamic system prompt
│   ├── capture/
│   │   └── route.ts                  # DONE — interview streaming with password auth
│   └── feedback/
│       └── route.ts                  # DONE — server-side feedback logging
lib/
├── pinecone.ts                       # KEEP — existing Pinecone client
├── entity-detection.ts               # KEEP — existing entity detection
├── types.ts                          # DONE — VisitorData, Persona, Focus types
├── visitor-data.ts                   # DONE — validateVisitorData
├── persona-config.ts                 # DONE — weights, tones, questions, core IDs
└── analytics.ts                      # KEEP — logAnalytics wrapper
scripts/
├── ingest.ts                         # MODIFY — extend to handle knowledge_entries.json
├── eval.ts                           # KEEP — existing eval tests (12 cases, 100% recall)
└── structure.ts                      # DONE — raw transcript → structured entries
prompts/
└── phase1a-interview.md              # DONE — Claude App interview prompt
data/
├── resume.json                       # KEEP — existing 39 chunks (with focus_tags, is_core_strength)
├── altos_ventures_interview_qa.md    # KEEP — existing interview Q&A data
└── knowledge_entries.json            # NEW (created by structure.ts) — structured Q&A entries
```

---

# REQUIREMENTS CHECKLIST

### Phase 1: Knowledge Capture
- [x] Admin capture page at `/admin/capture` with password protection
- [x] Interview AI asks progressively deeper questions with topic structure
- [x] System prompt lists existing entries to avoid redundancy and prioritizes gaps
- [x] Session save as .txt (for `structure.ts`) and .json download
- [x] API route `/api/capture` with password validation on every request
- [x] Claude App prompt also available (`prompts/phase1a-interview.md`)
- [x] Structuring pipeline (`scripts/structure.ts`) converts transcripts to typed entries
- [x] Output schema compatible with existing `resume.json` structure
- [x] Zod schema validation rejects malformed entries
- [x] Deduplication check (>0.90 similarity) via Pinecone query
- [x] Session report shows entries captured, sections, focus areas, duplicates
- [ ] First interview session conducted and structured

### Phase 2: Knowledge Indexing
- [ ] `scripts/ingest.ts` extended to read both `resume.json` and `knowledge_entries.json`
- [ ] Q&A entries indexed with same approach as resume chunks (single vector, enriched text)
- [ ] Q&A metadata includes `chunk_type`, `question`, `answer_summary`
- [ ] `buildEnrichedText()` prepends question for Q&A entries
- [ ] All embeddings use `gemini-embedding-001` (3072 dims)
- [ ] Pinecone namespace: `resume`, index: `resume-rag`
- [ ] Coverage gap report generated after indexing
- [ ] `npm run eval` still passes after re-indexing

### Phase 3: Visitor Chat — COMPLETE
- [x] Gateway Modal: bilingual (EN/KO), accessible, responsive, mandatory, editable later
- [x] Cold start: dedicated init flow, no fake messages, grounded in real data
- [x] Retrieval: entity detection + parallel queries + focus filter + pinned chunks
- [x] Persona-aware re-ranking via `scoreChunk()`
- [x] Dynamic system prompt: persona tone + focus highlighting
- [x] First-person voice preserved (AI speaks as DJ)
- [x] Bilingual support preserved (EN/KO language detection)
- [x] visitorData validated server-side (`validateVisitorData`)
- [x] In-memory rate limiting preserved (15 req/min)
- [x] `maxDuration = 30` preserved
- [x] Error handling degrades gracefully
- [x] Privacy guardrails (no phone/address/salary)
- [x] Strict anti-hallucination rules
- [x] Suggested questions adapt to persona + language
- [x] Feedback buttons (thumbs up/down) on each assistant message
- [x] Settings reset via gear icon

### Phase 4: Analytics & Feedback
- [x] Server-side structured logging via `logAnalytics()` for queries and init
- [x] `/api/feedback` route for server-side feedback logging
- [x] Privacy notice added to WelcomeModal (bilingual)
- [x] SessionId generated on page load and passed to feedback
- [x] Feedback sent to server via POST (not client-side console.log)
- [ ] Knowledge gap detection from Vercel logs (manual V1)
- [ ] Feedback loop: gaps → Phase 1A sessions → structure → ingest

---

# IMPLEMENTATION ORDER

Build in this order to get value at each step:

1. **Phase 1A (Capture)** — Conduct interview sessions on Claude App. This is the content bottleneck. Target: 50+ Q&A entries covering gaps.
2. **Phase 1B → Phase 2 (Structure + Index)** — Run `structure.ts` on transcripts, then extend `ingest.ts` to index both sources.
3. **Phase 4 (Analytics fixes)** — Add `/api/feedback` route, privacy notice, sessionId tracking.
4. **Iterate** — Review Vercel logs for gaps, conduct more interviews, re-index.

Each phase is independently deployable. The existing chat continues working throughout.

---

Please provide the complete, production-ready TypeScript code for all files listed in the file structure that are not yet marked DONE. Use strict typing (no `any`), Tailwind CSS 4 conventions, and handle every edge case noted. Follow the existing code patterns (useChat with sendMessage, streamText with google(), entity-detection, Map-based chunk collection).
