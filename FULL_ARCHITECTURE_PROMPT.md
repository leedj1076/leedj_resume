Act as a Principal Full-Stack AI Engineer and RAG Architect. I am building **"Ask DJ"** — a shareable AI knowledge base where VCs, corporate strategy teams, business development leads, and hiring managers can chat with an AI that deeply knows my professional experience. Think of it as a living, conversational portfolio that goes far beyond a static resume.

The system has **4 phases** that work together as a pipeline:

1. **Knowledge Capture** — An AI interviews me, extracting detailed experience in my own voice.
2. **Knowledge Indexing** — Raw interviews are structured, chunked, and stored with rich metadata.
3. **Visitor Chat** — The public-facing chatbot with intent-driven retrieval and persona-tuned responses.
4. **Analytics & Feedback** — Tracks what visitors ask, which topics perform well, and where knowledge gaps exist.

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
| LLM (capture)     | **`gemini-2.5-flash`** for interviewing me             |
| LLM (structuring) | **`gemini-2.0-flash`** for post-processing (cheaper)   |
| Markdown render   | **`react-markdown` 10.1**                              |
| Hosting           | **Vercel** (hobby plan)                                |
| Analytics store   | Vercel KV (Redis) — or flat JSON files for v1          |
| Auth              | None (public link) — rate limit by IP                  |
| Script runner     | **`tsx`** (for ingest/eval/structure scripts via `--env-file=.env.local`) |

### Existing Environment Variables (.env.local)
```
GOOGLE_GENERATIVE_AI_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=resume-rag
```

New variables to add:
```
ADMIN_PASSWORD=...           # Simple password for /admin pages
```

### Vercel Constraints (Design Around These)
- Current route already sets `export const maxDuration = 30` — this works on Vercel Pro/Hobby for streaming.
- Pinecone index: `resume-rag`, namespace: `resume`, dimension: **3072**, metric: cosine.
- No persistent server — all state in Pinecone or client-side.

### Existing Patterns to PRESERVE (Do Not Replace)
These patterns are already working in production. The architecture must build on top of them, not discard them:

1. **Entity detection (`lib/entity-detection.ts`)** — Zero-latency regex-based keyword→filter mapping for companies (EN + KR aliases), sections, temporal ranges, and recency. This stays as-is and extends to work alongside the new intent layer.

2. **Pinned chunks** — `narrative-career-trajectory` and `personal-summary` are always fetched and included. Company overview chunks are dynamically pinned when a company is detected.

3. **Parallel retrieval** — Semantic search + entity-filtered search + pinned fetch run as `Promise.all()`. This pattern stays.

4. **Context stratification** — Chunks have `depth: "surface" | "deep_dive"`. The context block separates OVERVIEW from DETAILED STORIES. This continues for all existing resume chunks.

5. **Conversation-aware retrieval** — `buildRetrievalQuery()` prepends the last assistant message for better follow-up embedding. This stays.

6. **Bilingual support (EN / KO)** — The UI has full i18n with a language toggle. The system prompt detects language and responds in kind. All new UI (Gateway Modal, suggested questions, feedback) must support both languages.

7. **In-memory rate limiting** — `Map<string, {count, resetAt}>` per IP, 15 req/min. This stays as the default (no Vercel KV dependency required for v1).

8. **Streaming via `streamText()`** — Uses `result.toUIMessageStreamResponse()`. The `useChat` hook from `@ai-sdk/react` with `sendMessage()` pattern.

---

# PHASE 1: KNOWLEDGE CAPTURE (Private, DJ-Facing)

## Purpose
An AI conducts structured interviews with me, covering every role, project, technical decision, behavioral scenario, and skill in depth. The goal is to extract **200+ detailed Q&A entries** that represent how I would answer in a real interview — in my own voice, with specifics.

## 1A. The Interview Admin Page

Build a private `/admin/capture` page protected by a simple env-based password check (compare `ADMIN_PASSWORD` env var against a password input on first visit, store in sessionStorage).

The page is a full-screen chat interface (reuse the existing chat UI pattern from `page.tsx`) where the AI interviews me.

### Interview System Prompt

```
You are a senior technical interviewer conducting a deep-dive interview with DJ
to capture his professional experience for an AI knowledge base.

YOUR GOAL: Extract specific, detailed, story-rich answers that a recruiter or
hiring manager would find compelling. Push for specifics — don't accept vague answers.

INTERVIEW STRUCTURE:
1. Start with a topic menu: "Which area should we cover today?"
   - A specific role/company
   - A specific project
   - Technical deep-dive (architecture, system design, etc.)
   - Behavioral / leadership stories
   - Skills & tools proficiency
   - Career narrative & motivation

2. For each topic, ask 5-8 progressively deeper questions:
   - Start broad: "Walk me through your role at [Company]."
   - Then drill in: "What was the most technically challenging part?"
   - Push for metrics: "Can you quantify the impact?"
   - Get the story: "What went wrong and how did you handle it?"
   - Extract transferable lessons: "What would you do differently today?"

3. After each answer, do ONE of:
   - Ask a follow-up that digs deeper into something interesting.
   - Validate: "So to summarize, you [X]. Is that accurate?"
   - Move to the next question if the answer is sufficiently detailed.

RULES:
- Never accept one-sentence answers. Probe: "Can you elaborate on that?"
- If I say something vague like "I improved performance," ask: "By how much? What metrics?"
- When I mention a technology, ask how I used it specifically, not just that I used it.
- Keep a mental checklist of what a recruiter would want to know:
  [impact metrics, team size, my specific role vs. team effort, technologies used,
   challenges faced, decisions made, outcomes achieved]
- After completing a topic, summarize what was captured and ask if I want to add anything.
- Track which topics we've covered across sessions (I'll paste previous session summaries).
```

### Session Management
- Each interview session is saved as a raw transcript (JSON array of messages).
- Store transcripts in `/data/capture/sessions/` as `{date}-{topic}.json`.
- At the start of each session, I can paste a summary of previous sessions so the AI doesn't re-ask covered topics.
- The capture page should have a "Save Session" button that downloads the transcript as JSON.

## 1B. The Structuring Pipeline (LLM Post-Processing)

After each interview session, run a structuring pipeline (`scripts/structure.ts`) that converts raw conversation into indexed knowledge entries.

### Structuring Prompt (run per meaningful Q&A exchange via `gemini-2.0-flash`)

```
You are a knowledge structuring agent. Given a raw interview exchange between
an interviewer and DJ, extract a structured knowledge entry.

INPUT: A Q&A exchange from the interview transcript.

OUTPUT: A JSON object with this exact schema:

{
  "chunk_id": "unique-slug-based-on-content",
  "question": "The canonical question this answers (rewrite for clarity if needed)",
  "answer_summary": "A 1-2 sentence summary of the answer (50 tokens max)",
  "text": "The full, detailed answer in DJ's voice (150-400 tokens).
           Preserve his phrasing and personality. Include specific metrics,
           technologies, and outcomes. Write in first person.",
  "source_type": "qa_story",
  "section": "experience" | "skills" | "projects" | "education" | "leadership" | "awards" | "narrative" | "stories",
  "company": "Company Name" | null,
  "role": "Job Title" | null,
  "start_date": "YYYY-MM" | null,
  "end_date": "YYYY-MM" | null,
  "skills": ["skill1", "skill2"],
  "keywords": ["keyword1", "keyword2"],
  "token_count": <computed after generation>,
  "depth": "deep_dive",
  "focus_tags": ["Frontend / UI", "Backend / Systems", "AI / LLMs", "Full-Stack", "Business Development", "Leadership"],
  "is_core_strength": false,
  "interview_topics": ["architecture", "scaling", "team_leadership", "negotiation", "fundraising"],
  "related_entries": []
}

RULES:
- Preserve DJ's voice and personality. Don't sanitize into corporate-speak.
- If the answer contains multiple distinct points, split into separate entries.
- The "question" field should be the question a recruiter would naturally ask
  that this answer addresses — not necessarily the interviewer's exact words.
- "answer_summary" is used for retrieval (keep it dense with keywords).
  "text" is shown to the user (keep it conversational and rich).
- Set "is_core_strength" to true ONLY for top achievements with strong metrics.
- "focus_tags" can contain multiple values if the answer spans areas.
- "section" must match the existing sections in resume.json where possible.
- "related_entries" is populated later during cross-referencing.
```

**IMPORTANT:** The output schema is designed to be **compatible with the existing `resume.json` structure**. New Q&A entries use the same fields (`chunk_id`, `text`, `source_type`, `section`, `company`, `role`, `start_date`, `end_date`, `skills`, `keywords`, `token_count`, `depth`) plus additional fields (`question`, `answer_summary`, `focus_tags`, `is_core_strength`, `interview_topics`, `related_entries`). This means both resume chunks and Q&A entries can coexist in the same Pinecone namespace.

### Structuring Pipeline Steps (scripts/structure.ts)
1. Parse the raw transcript into individual Q&A exchanges (each interviewer question + my full response).
2. For each exchange, run the structuring prompt via `gemini-2.0-flash` (cheaper, fast enough).
3. Validate the output JSON against the schema (reject malformed entries).
4. Compute `token_count` for each entry.
5. Deduplicate: if a new entry is >0.90 cosine similarity to an existing entry (check via embedding), flag for manual review instead of auto-adding.
6. Append structured entries to `/data/knowledge_entries.json` (single file, JSON array — matching `resume.json` pattern).
7. Output a session report: "Captured X new entries. Topics covered: [list]. Suggested gaps: [list]."

Add to `package.json` scripts:
```json
"structure": "tsx --env-file=.env.local scripts/structure.ts"
```

---

# PHASE 2: KNOWLEDGE INDEXING (Automated Pipeline)

## Purpose
Take all knowledge entries (both existing `resume.json` and new `knowledge_entries.json`) and index them in Pinecone with enhanced metadata and a **parent-child chunking strategy** for the Q&A entries.

## 2A. Dual-Source Ingestion

The indexing script must handle **two sources** that coexist in the same Pinecone namespace (`resume`):

### Source 1: Resume Chunks (existing — `data/resume.json`)
These are the existing 38 chunks. Index them exactly as the current `scripts/ingest.ts` does:
- Chunk ID = `chunk_id` from JSON
- Embedding of `buildEnrichedText()` (role + company + dates + text)
- Metadata: `section`, `company`, `role`, `start_date` (numeric YYYYMM), `end_date`, `skills`, `keywords`, `depth`, `enrichedText`
- **New metadata fields added:** `chunk_type: "resume"`, `focus_tags` (computed from skills/section), `is_core_strength`

### Source 2: Q&A Entries (new — `data/knowledge_entries.json`)
For each Q&A entry, create **two vectors** (parent-child):

**Summary Vector (for retrieval):**
```typescript
{
  id: `${entry.chunk_id}__summary`,
  values: embed(entry.answer_summary),   // embed the short summary
  metadata: {
    entry_id: entry.chunk_id,
    chunk_type: "qa_summary",
    question: entry.question,
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
    enrichedText: entry.answer_summary,   // stored for retrieval display
  }
}
```

**Detail Vector (for generation — fetched after retrieval):**
```typescript
{
  id: `${entry.chunk_id}__detail`,
  values: embed(buildEnrichedText(entry)),  // embed the full enriched text
  metadata: {
    entry_id: entry.chunk_id,
    chunk_type: "qa_detail",
    question: entry.question,
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
    enrichedText: buildEnrichedText(entry),  // full enriched text for context
  }
}
```

### Why Parent-Child for Q&A Only?
- Resume chunks are already short and dense (100-300 tokens) — they don't need splitting.
- Q&A entries have both a summary (good for matching recruiter questions) and a detailed answer (good for LLM context). Searching the short summary gives better retrieval precision, then the detail is hydrated for generation.
- At 200 Q&A entries + 38 resume chunks = ~438 vectors total. Well within Pinecone free tier.

## 2B. Enhanced Metadata for All Chunks

Add `focus_tags` to existing resume chunks by mapping from their `section` and `skills`:

```typescript
function computeFocusTags(entry: ResumeEntry): string[] {
  const tags: string[] = [];
  const skillStr = [...entry.skills, ...entry.keywords].join(" ").toLowerCase();

  if (/react|vue|angular|css|ui|ux|frontend|design/i.test(skillStr)) tags.push("Frontend / UI");
  if (/node|python|java|database|api|backend|server|kubernetes|hadoop/i.test(skillStr)) tags.push("Backend / Systems");
  if (/ai|llm|ml|machine learning|rag|neural|gpt|gemini|diffusion/i.test(skillStr)) tags.push("AI / LLMs");
  if (/partnership|business|strategy|gtm|fundrais|investor|negotiat/i.test(skillStr)) tags.push("Business Development");
  if (/lead|team|manage|mentor|cross-functional/i.test(skillStr)) tags.push("Leadership");

  // Full-Stack if it spans multiple technical areas
  if (tags.includes("Frontend / UI") && tags.includes("Backend / Systems")) tags.push("Full-Stack");

  return tags.length > 0 ? tags : ["Full-Stack"]; // default to Full-Stack if no match
}
```

## 2C. Cross-Referencing & Related Entries

After all entries are indexed, run a cross-referencing pass:
1. For each Q&A entry, find the top 3 most similar OTHER entries (by embedding cosine similarity).
2. Store their IDs in `related_entries` in the JSON file.
3. This enables the chat system to suggest: "Related to this, I also worked on [X]..."

## 2D. Core Strengths Computation

After indexing:
1. Count entries per `focus_tag` and `section`.
2. Identify entries with `is_core_strength: true`.
3. Rank by frequency × depth.
4. Store the **top 5 core strengths** as a config file:

```typescript
// /data/core_strengths.json
{
  "strengths": [
    { "label": "Global Partnerships (Apple, Meta, Google)", "entry_ids": ["exp-dug-partnerships", "narrative-partnership-expertise", ...] },
    { "label": "AI & LLM Integration", "entry_ids": ["exp-dug-ai-ops", ...] },
    // ...top 5
  ],
  "last_computed": "2026-02-13"
}
```

## 2E. The Unified Indexing Script (scripts/index.ts)

Replace the current `scripts/ingest.ts` with a unified script that:
1. Reads `data/resume.json` (existing 38 chunks).
2. Reads `data/knowledge_entries.json` (new Q&A entries, if exists).
3. Computes `focus_tags` for all entries.
4. Generates embeddings using `gemini-embedding-001` (3072 dims, task type: `RETRIEVAL_DOCUMENT`).
   - Resume chunks: single embedding of `buildEnrichedText()`.
   - Q&A entries: two embeddings (summary + detail enriched text).
5. Upserts all vectors to Pinecone namespace `resume`.
6. Runs cross-referencing for Q&A entries.
7. Computes core strengths.
8. Outputs report:

```
Indexed 38 resume chunks + 200 Q&A entries (438 vectors total).
Core strengths: [list]
Coverage gaps:
  ⚠️ "behavioral" has 2 entries (recommend 10+)
  ⚠️ "education" has 0 Q&A entries (recommend 3+)
```

Add to `package.json` scripts:
```json
"index": "tsx --env-file=.env.local scripts/index.ts"
```

Keep the existing `ingest` script as a fallback:
```json
"ingest": "tsx --env-file=.env.local scripts/ingest.ts",
"index": "tsx --env-file=.env.local scripts/index.ts"
```

---

# PHASE 3: RECRUITER CHAT (Public, Recruiter-Facing)

## Purpose
The shareable link (e.g., `ask-dj.vercel.app`) where visitors chat with the AI. Adds the Gateway Modal, intent-driven retrieval, and persona-tuned generation **on top of** the existing chat infrastructure.

## 3A. The Gateway Modal (Frontend)

Create a `<WelcomeModal />` component in `app/components/WelcomeModal.tsx`.

### Visual Design
- Full-screen overlay: `bg-zinc-900/80 backdrop-blur-md`.
- Centered card: white, subtle shadow, max-w-lg, rounded-2xl.
- **Responsive:** On mobile (< 640px), full-width with padding, pills stack vertically, 44px min touch targets.

### Bilingual Content

```typescript
const MODAL_UI = {
  en: {
    heading: "Welcome to Ask DJ",
    q1Label: "I'm a...",
    q2Label: "Interested in...",
    button: "Start Chat →",
    disabledHint: "Select both options to continue",
  },
  ko: {
    heading: "Ask DJ에 오신 것을 환영합니다",
    q1Label: "저는...",
    q2Label: "관심 분야는...",
    button: "대화 시작 →",
    disabledHint: "두 옵션을 모두 선택해주세요",
  },
} as const;
```

### Question 1: Persona
Selectable pill buttons (single-select, radio behavior):

```typescript
type Persona = "VC / Investor" | "Corporate Strategy" | "BD / Partnerships" | "Hiring Manager";

const PERSONA_LABELS: Record<Lang, Record<Persona, string>> = {
  en: {
    "VC / Investor": "VC / Investor",
    "Corporate Strategy": "Corporate Strategy",
    "BD / Partnerships": "BD / Partnerships",
    "Hiring Manager": "Hiring Manager",
  },
  ko: {
    "VC / Investor": "VC / 투자자",
    "Corporate Strategy": "기업 전략",
    "BD / Partnerships": "사업개발 / 파트너십",
    "Hiring Manager": "채용 담당자",
  },
};
```

### Question 2: Focus
Selectable pill buttons (single-select):

```typescript
type Focus =
  | "Business Development"
  | "AI / LLMs"
  | "Leadership & Strategy"
  | "Full-Stack";

const FOCUS_LABELS: Record<Lang, Record<Focus, string>> = {
  en: {
    "Business Development": "Business Development",
    "AI / LLMs": "AI / LLMs",
    "Leadership & Strategy": "Leadership & Strategy",
    "Full-Stack": "Full Overview",
  },
  ko: {
    "Business Development": "사업 개발",
    "AI / LLMs": "AI / LLM",
    "Leadership & Strategy": "리더십 & 전략",
    "Full-Stack": "전체 개요",
  },
};
```

**NOTE:** The Focus options are tailored to DJ's actual resume strengths (business development, partnerships, AI, leadership) rather than generic engineering categories. Adjust these based on knowledge base coverage.

### Pill UX
- **Selected:** `bg-zinc-900 text-white`, subtle `scale-[1.02]` transition.
- **Unselected:** `border border-zinc-300 bg-white`, `hover:border-zinc-400 hover:scale-[1.01]`.
- **Keyboard:** `tabIndex={0}`, Enter/Space to select, `role="radio"`, `aria-checked`.

### Action Button
- **Disabled** (until both selected): `opacity-40 cursor-not-allowed`.
- **Enabled:** `bg-zinc-900 text-white hover:bg-zinc-800`.

### State & Edge Cases
```typescript
interface VisitorData {
  persona: Persona;
  focus: Focus;
}
```

- Save selections to `visitorData` in React state. Pass to `useChat` via `body`.
- **No backdrop dismiss** — modal is mandatory.
- **Editable later** — settings icon in chat header reopens modal (with confirmation: "Changing your profile will reset the conversation. Continue?" / "프로필 변경 시 대화가 초기화됩니다. 계속하시겠습니까?").
- The language toggle from the existing header should also be accessible in the modal.

## 3B. State Management & Cold Start (Frontend — page.tsx)

### Updated useChat Integration
```typescript
const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
const [showModal, setShowModal] = useState(true);

const { messages, sendMessage, stop, status, error } = useChat({
  body: { visitorData },
  onError: (err) => console.error("Chat error:", err),
});
```

### Personalized Cold Start (No Fake Messages)
1. When user clicks "Start Chat →", call `/api/chat` with a special init body: `{ type: "init", visitorData }`.
2. Show skeleton loader with "Personalizing your experience..." / "맞춤 경험을 준비하고 있습니다..."
3. The init handler retrieves core strength entries matching the user's focus and generates a 2-3 sentence personalized welcome.
4. Render the welcome as the first `assistant` message.

### Updated Suggested Questions (Persona-Aware)
After the cold start, the suggested questions should adapt to the persona:

```typescript
const PERSONA_QUESTIONS: Record<Persona, Record<Lang, string[]>> = {
  "VC / Investor": {
    en: [
      "What's your track record building and scaling companies?",
      "Tell me about your biggest revenue growth story",
      "How did you approach fundraising at Flint?",
      "What market opportunities are you most excited about?",
    ],
    ko: [
      "회사를 구축하고 성장시킨 경험을 알려주세요",
      "가장 큰 매출 성장 사례를 알려주세요",
      "Flint에서 자금 조달은 어떻게 접근하셨나요?",
      "가장 기대되는 시장 기회는 무엇인가요?",
    ],
  },
  "Corporate Strategy": {
    en: [
      "How do you approach GTM strategy for new products?",
      "Tell me about your enterprise client experience",
      "What's your process for competitive analysis?",
      "How have you translated AI into business value?",
    ],
    ko: [
      "신제품 GTM 전략을 어떻게 수립하시나요?",
      "엔터프라이즈 고객 경험에 대해 알려주세요",
      "경쟁 분석 프로세스를 설명해주세요",
      "AI를 비즈니스 가치로 어떻게 전환하셨나요?",
    ],
  },
  "BD / Partnerships": {
    en: [
      "Walk me through your Apple partnership story",
      "How do you approach enterprise deal negotiations?",
      "What's your biggest partnership win by revenue impact?",
      "How do you build relationships with tech giants?",
    ],
    ko: [
      "Apple 파트너십 이야기를 들려주세요",
      "기업 거래 협상은 어떻게 접근하시나요?",
      "매출 기여가 가장 큰 파트너십 성과는?",
      "대형 테크 기업과의 관계 구축 방법은?",
    ],
  },
  "Hiring Manager": {
    en: [
      "Walk me through your career progression",
      "What are your core strengths?",
      "Tell me about your leadership experience",
      "What's your experience with AI and LLMs?",
    ],
    ko: [
      "경력 성장 과정을 설명해주세요",
      "핵심 역량은 무엇인가요?",
      "리더십 경험에 대해 알려주세요",
      "AI와 LLM 관련 경험은 어떤가요?",
    ],
  },
};
```

## 3C. The API Route (app/api/chat/route.ts)

### Updated Request Body Interface
```typescript
interface ChatRequestBody {
  messages: Message[];
  visitorData?: VisitorData;
  type?: "init" | "chat";   // distinguish cold start from regular chat
}
```

### Input Validation
```typescript
const VALID_PERSONAS = ["VC / Investor", "Corporate Strategy",
                        "BD / Partnerships", "Hiring Manager"] as const;
const VALID_FOCUSES = ["Business Development", "AI / LLMs",
                       "Leadership & Strategy", "Full-Stack"] as const;

function validateVisitorData(data: unknown): VisitorData | null {
  if (!data || typeof data !== "object") return null;
  const { persona, focus } = data as Record<string, unknown>;
  if (!VALID_PERSONAS.includes(persona as Persona)) return null;
  if (!VALID_FOCUSES.includes(focus as Focus)) return null;
  return data as VisitorData;
}

// If invalid, use safe defaults (full overview, no persona bias):
const safeVisitorData: VisitorData = validateVisitorData(body.visitorData)
  ?? { persona: "Hiring Manager", focus: "Full-Stack" };
```

### 3C-1. Enhanced Retrieval (Extends Existing Pattern)

The existing retrieval pipeline (entity detection → parallel queries → pinned chunks → context stratification) stays intact. The new intent layer adds **two enhancements on top**:

**Enhancement A — Focus-Aware Metadata Filter:**

When `visitorData.focus` is NOT "Full-Stack", add a secondary filter query to the existing `Promise.all()`:

```typescript
// Existing pattern (preserved):
const [semanticResults, entityResults, pinnedResults] = await Promise.all([
  ns.query({ vector: embedding, topK: 5, includeMetadata: true }),
  detected ? ns.query({ vector: embedding, topK: 15, includeMetadata: true, filter: detected.filter }) : null,
  ns.fetch({ ids: pinnedIds }),
]);

// NEW: Add focus-filtered query when visitorData has a specific focus
const focusResults = safeVisitorData.focus !== "Full-Stack"
  ? await ns.query({
      vector: embedding,
      topK: 8,
      includeMetadata: true,
      filter: { focus_tags: { $in: [safeVisitorData.focus] } },
    })
  : null;

// Merge results — pinned first, then entity-filtered, then focus-filtered, then semantic
addPinnedChunks(chunks, pinnedIds, pinnedResults);
if (entityResults) addMatchChunks(chunks, entityResults.matches);
if (focusResults) addMatchChunks(chunks, focusResults.matches);
addMatchChunks(chunks, semanticResults.matches);
```

**Enhancement B — Persona-Aware Re-ranking:**

After all chunks are collected, apply a lightweight re-ranking score boost before assembling context:

```typescript
function applyPersonaBoost(
  chunks: Map<string, ChunkRecord>,
  visitor: VisitorData
): Map<string, ChunkRecord & { boost: number }> {
  const boosted = new Map();
  for (const [id, chunk] of chunks) {
    let boost = 0;

    // Boost core strength chunks
    if (chunk.is_core_strength) boost += 0.05;

    // Boost chunks matching visitor's focus
    if (chunk.focus_tags?.includes(visitor.focus)) boost += 0.03;

    // Persona-specific section preferences
    boost += PERSONA_SECTION_WEIGHTS[visitor.persona]?.[chunk.section] ?? 0;

    boosted.set(id, { ...chunk, boost });
  }
  return boosted;
}

const PERSONA_SECTION_WEIGHTS: Record<Persona, Record<string, number>> = {
  "VC / Investor":        { experience: 0.03, skills: 0.00, stories: 0.04, education: 0.01, narrative: 0.04 },
  "Corporate Strategy":   { experience: 0.04, skills: 0.02, stories: 0.03, education: 0.01, narrative: 0.02 },
  "BD / Partnerships":    { experience: 0.03, skills: 0.00, stories: 0.05, education: 0.00, narrative: 0.03 },
  "Hiring Manager":       { experience: 0.04, skills: 0.02, stories: 0.02, education: 0.02, narrative: 0.02 },
};
```

**Enhancement C — Detail Hydration for Q&A Entries:**

When a retrieved chunk is a `qa_summary`, fetch its corresponding `__detail` text for the LLM context:

```typescript
// After collecting all chunks, find any qa_summary chunks and hydrate
const summaryChunks = [...chunks.values()].filter(c => c.chunk_type === "qa_summary");
if (summaryChunks.length > 0) {
  const detailIds = summaryChunks.map(c => c.entry_id + "__detail");
  const detailResults = await ns.fetch({ ids: detailIds });
  for (const s of summaryChunks) {
    const detail = detailResults.records[s.entry_id + "__detail"];
    if (detail?.metadata?.enrichedText) {
      // Replace summary text with detail text in the chunks map
      chunks.set(s.id, { ...chunks.get(s.id)!, enrichedText: detail.metadata.enrichedText as string });
    }
  }
}
```

### 3C-2. Dynamic System Prompt (Extends Existing)

The existing system prompt (first-person voice, response depth rules, bilingual support, formatting, anti-hallucination) is preserved and extended with **persona-specific layers**.

The system prompt is now assembled from layers:

#### Layer 1: Identity & Core Rules (existing, preserved)
```
You are the professional whose resume and knowledge base is provided below.
Answer questions as if you are speaking about yourself in first person ("I", "my", "me").
Be warm, conversational, and natural — like you're chatting with a recruiter over coffee.

Today's date is ${new Date().toISOString().split("T")[0]}.
Knowledge base last updated: ${lastIndexDate}.
```

#### Layer 2: Response Depth (existing, preserved)
```
RESPONSE DEPTH — this is critical:
- INITIAL or NEW TOPIC question: Give a concise overview (3-5 bullet points). Invite follow-up.
- FOLLOW-UP question (same topic as previous exchange): Go deeper — use DETAILED STORIES
  for specific stories, metrics, negotiation details, and nuances.
- When the user switches to an UNRELATED topic: reset to overview level again.

CONTEXT STRUCTURE:
- The OVERVIEW section contains surface-level facts.
- The DETAILED STORIES section contains in-depth stories with specific metrics.
```

#### Layer 3: Persona-Specific Tone (NEW)
```typescript
const TONE_RULES: Record<Persona, string> = {
  "VC / Investor": `
    VISITOR CONTEXT: This visitor is a VC or Investor.
    Speak in terms of market opportunity, scalability, and value creation.
    Emphasize track record: revenue growth metrics, fundraising outcomes, partnership deal sizes.
    Frame experience through an investor lens: "What's the moat?", "How does this scale?"
    Highlight founder experience, 0→1 building, and commercial instincts.
    Keep answers structured and data-driven — investors pattern-match quickly.
  `,
  "Corporate Strategy": `
    VISITOR CONTEXT: This visitor is from a Corporate Strategy team.
    Focus on strategic thinking, market analysis, and cross-functional execution.
    Emphasize GTM strategy, competitive positioning, and organizational impact.
    Discuss how I've navigated enterprise environments (Samsung, Hyundai migrations)
    and translated complex technologies into business value.
    Speak in frameworks and structured reasoning — strategy teams value analytical rigor.
  `,
  "BD / Partnerships": `
    VISITOR CONTEXT: This visitor is in Business Development or Partnerships.
    Lead with partnership wins: Apple, Meta, Google PoC initiatives and deal outcomes.
    Share negotiation stories, deal structures, and relationship-building approaches.
    Emphasize revenue impact, pipeline development, and cross-company collaboration.
    Speak peer-to-peer — assume they understand the BD craft and want specifics.
  `,
  "Hiring Manager": `
    VISITOR CONTEXT: This visitor is a Hiring Manager evaluating DJ for a role.
    Balance business impact with team fit signals.
    Mention team sizes managed, cross-functional collaboration, and leadership style.
    Translate technical work into impact: "Grew revenue 55% YoY" not "Optimized pipeline."
    Show breadth (co-founder, BD, AI, strategy) while emphasizing depth in their focus area.
    Keep initial answers concise and scannable — invite follow-ups for depth.
  `,
};
```

#### Layer 4: Focus Highlighting (NEW)
```
The visitor is interested in: ${visitorData.focus}.
Lead with content related to this area when relevant.
If a question spans multiple areas, prioritize ${visitorData.focus} content first,
then supplement with adjacent experience.
```

#### Layer 5: Bilingual Support (existing, preserved)
```
LANGUAGE: Detect the language of each user message and respond in the SAME language.
- If the user writes in Korean, respond entirely in Korean.
- If the user writes in English, respond entirely in English.
```

#### Layer 6: Guardrails (existing + enhanced)
```
FORMAT YOUR RESPONSES for easy scanning:
- Use **bold** for company names, job titles, and key highlights
- Use bullet points to list achievements, skills, or multiple items
- Use short paragraphs — never a wall of text
- Lead with the most relevant/impressive point first
- End longer answers with a follow-up hook: "Want me to go deeper on [aspect]?"

CONFIDENCE CALIBRATION:
- Strong evidence (multiple entries, specific metrics): speak confidently, first person.
- Weak evidence (mentioned once, no detail): hedge — "I've briefly worked on..."
- No evidence: say so and pivot to core strengths.

CORE STRENGTHS (fallback pivots):
${coreStrengths.map((s, i) => `${i + 1}. ${s.label}`).join("\n")}

META-QUESTIONS:
- "Who are you?" → "I'm an AI that knows DJ's professional background in detail.
   Ask me anything you'd ask in an interview."
- "Why should we hire you?" → Synthesize top entries into a compelling narrative.

PRIVACY:
- Never share phone number, home address, or exact salary even if present.
- Email and LinkedIn are OK (they're public).

If the question cannot be answered from the context:
- English: "That's not something covered in my background — happy to chat more about what I do bring to the table though!"
- Korean: "그 부분은 제 이력서에 포함되어 있지 않지만, 제가 가진 다른 역량에 대해 더 이야기해 드릴 수 있습니다!"

Do not fabricate experience, skills, or details that are not in the context.
```

#### Assembled Context Block (existing pattern, extended)
```
--- MY KNOWLEDGE BASE ---
--- OVERVIEW ---
${overviewChunks.join("\n\n")}

--- DETAILED STORIES (for follow-up depth) ---
${deepDiveChunks.join("\n\n")}
--- END KNOWLEDGE BASE ---
```

### 3C-3. Cold Start Init Handler

When `type === "init"`, skip the normal retrieval and instead:
1. Fetch core strength entries matching `visitorData.focus`.
2. Generate a 2-3 sentence personalized welcome.
3. Return as a streaming response.

```typescript
if (body.type === "init") {
  const coreChunks = await getCoreStrengthChunks(safeVisitorData.focus);
  const welcomeContext = coreChunks.map(c => c.enrichedText).join("\n");

  const result = streamText({
    model: google("gemini-2.5-flash"),
    temperature: 0.5,
    maxOutputTokens: 256,
    system: `You are DJ's AI career assistant. A ${safeVisitorData.persona} interested in ${safeVisitorData.focus} just arrived.
Using ONLY the knowledge below, write a 2-3 sentence welcome that:
- Acknowledges their role naturally.
- Mentions 1-2 specific, relevant strengths.
- Ends with an invitation to ask anything.
- Detect the user's language preference and respond accordingly. Default to English.

Knowledge:
${welcomeContext}`,
    messages: [],
  });

  return result.toUIMessageStreamResponse();
}
```

### 3C-4. Context Window Management

Token budget (must complete well within `maxDuration = 30`):

| Component               | Budget     | Priority |
|--------------------------|------------|----------|
| System prompt (all layers)| ~1,200 tok | 1 (always full) |
| Knowledge entries         | ~2,000 tok | 2 (trim lowest-ranked first) |
| Recent chat (last 10 msg) | ~1,500 tok | 3 (trim oldest first) |
| **Total budget**         | **~5,000 tok** | — |

Use the existing `MAX_HISTORY = 10` sliding window from the current implementation.

### 3C-5. Error Handling (Existing + Extended)

The existing try/catch pattern stays. Add visitorData validation:

```typescript
// Existing error handling (preserved):
try {
  const { messages, visitorData: rawVisitor, type } = await req.json();
  const safeVisitorData = validateVisitorData(rawVisitor)
    ?? { persona: "Hiring Manager", focus: "Full-Stack" };

  // ... retrieval and generation ...
} catch (error) {
  console.error("[RAG] Error:", error);
  return new Response(
    JSON.stringify({ error: "Something went wrong. Please try again." }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### 3C-6. Rate Limiting (Existing, Preserved)

Keep the existing in-memory rate limiter (15 req/min per IP). No Vercel KV dependency needed for v1.

```typescript
// Already implemented — no changes needed:
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```

---

# PHASE 4: ANALYTICS & FEEDBACK (Recruiter Intelligence)

## Purpose
Track what recruiters ask, which knowledge entries get surfaced, and where the system performs well or poorly.

## 4A. V1 Analytics (Lightweight — File-Based)

For v1, avoid external dependencies. Log analytics to JSON files on the server (Vercel serverless functions have `/tmp` write access, but it resets per invocation — so log to an API that appends to Vercel KV if available, or output to console for Vercel's log drain).

**Simplest approach for v1:** Log structured JSON to `console.log` with a prefix, then use Vercel's Log Drain to capture:

```typescript
function logAnalyticsEvent(event: AnalyticsEvent) {
  console.log("[ANALYTICS]", JSON.stringify(event));
}
```

## 4B. Data Model

```typescript
interface AnalyticsEvent {
  sessionId: string;            // generated client-side on modal submit
  timestamp: string;
  visitorData: VisitorData;
  type: "session_start" | "query" | "feedback";
  // For "query" events:
  userQuery?: string;
  retrievedChunkIds?: string[];
  topScore?: number;
  responseLatencyMs?: number;
  // For "feedback" events:
  messageIndex?: number;
  feedbackType?: "thumbs_up" | "thumbs_down";
}
```

## 4C. What Gets Logged

On **session start** (modal submit): session ID, visitor data, timestamp, user agent.

On **every chat request**: session ID, user query, retrieved chunk IDs, top retrieval score, latency.

On **feedback** (thumbs up/down on each response): session ID, message index, feedback type.

## 4D. Feedback UI

Add thumbs up/down buttons below each assistant message in `ChatMessage.tsx`:

```typescript
// Below each assistant message:
<div className="flex gap-1 mt-1">
  <button onClick={() => sendFeedback(index, "thumbs_up")}
    className="text-gray-400 hover:text-green-500 text-xs">👍</button>
  <button onClick={() => sendFeedback(index, "thumbs_down")}
    className="text-gray-400 hover:text-red-500 text-xs">👎</button>
</div>
```

## 4E. Knowledge Gap Detection

Periodically review analytics logs for:
- **Low-scoring queries** (top retrieval score < 0.65) → Topics to capture more content for.
- **High-frequency topics** → Ensure depth of coverage.
- **Thumbs-down patterns** → Review those specific entries and prompt behavior.

For v2, build a dashboard at `/admin/analytics`. For v1, review Vercel logs manually.

## 4F. Feedback → Capture Loop

The analytics data feeds back into Phase 1:
- **Low-scoring queries** → New interview session topics.
- **High-traffic topics** → Capture more detailed stories.
- **Thumbs-down responses** → Review and improve specific entries.

---

# FILE STRUCTURE

```
app/
├── page.tsx                          # Public chat page (MODIFY — add WelcomeModal + visitorData)
├── components/
│   ├── WelcomeModal.tsx              # NEW — Gateway modal
│   ├── ChatMessage.tsx               # NEW — Message bubble with feedback buttons
│   ├── ChatHeader.tsx                # NEW — Settings icon + language toggle + branding
│   └── SkeletonLoader.tsx            # NEW — Cold start loading state
├── admin/
│   ├── capture/
│   │   └── page.tsx                  # NEW — Private interview capture UI
│   └── analytics/
│       └── page.tsx                  # NEW (v2) — Analytics dashboard
├── layout.tsx                        # KEEP — existing root layout
├── globals.css                       # KEEP — existing Tailwind imports
├── api/
│   └── chat/
│       └── route.ts                  # MODIFY — add visitorData handling, focus filter, persona prompt
lib/
├── pinecone.ts                       # KEEP — existing Pinecone client
├── entity-detection.ts               # KEEP — existing entity detection
├── types.ts                          # NEW — VisitorData, Persona, Focus, analytics interfaces
├── rerank.ts                         # NEW — persona-aware re-ranking logic
├── systemPrompt.ts                   # NEW — dynamic system prompt builder
└── validation.ts                     # NEW — visitorData validation
scripts/
├── ingest.ts                         # KEEP — existing resume-only ingestion (fallback)
├── eval.ts                           # KEEP — existing eval tests
├── structure.ts                      # NEW — raw transcript → structured entries
├── index.ts                          # NEW — unified indexing (resume + Q&A entries)
├── cross-reference.ts                # NEW — compute related_entries
└── core-strengths.ts                 # NEW — compute top 5 strengths
data/
├── resume.json                       # KEEP — existing 38 resume chunks
├── altos_ventures_interview_qa.md    # KEEP — existing interview Q&A data
├── knowledge_entries.json            # NEW — structured Q&A entries from Phase 1
├── core_strengths.json               # NEW — computed core strengths
└── capture/
    └── sessions/                     # NEW — raw interview transcripts
```

---

# REQUIREMENTS CHECKLIST

### Phase 1: Knowledge Capture
- [ ] Interview AI asks progressively deeper questions with topic structure
- [ ] Admin page protected by env-based password
- [ ] Raw transcripts saved as JSON per session
- [ ] Structuring pipeline converts transcripts to typed knowledge entries via `gemini-2.0-flash`
- [ ] Output schema compatible with existing `resume.json` structure
- [ ] Deduplication check (>0.90 similarity) flags duplicates
- [ ] Session report shows entries captured and suggested gaps

### Phase 2: Knowledge Indexing
- [ ] Unified script indexes both `resume.json` and `knowledge_entries.json`
- [ ] Resume chunks: single embedding with `chunk_type: "resume"`
- [ ] Q&A entries: parent-child (summary + detail vectors)
- [ ] `focus_tags` computed for all entries
- [ ] All embeddings use `gemini-embedding-001` (3072 dims)
- [ ] Pinecone namespace: `resume`, index: `resume-rag`
- [ ] Cross-referencing populates related_entries
- [ ] Core strengths computed and stored
- [ ] Coverage gap report generated after indexing

### Phase 3: Recruiter Chat
- [ ] Gateway Modal: bilingual (EN/KO), accessible, responsive, mandatory, editable later
- [ ] Cold start: dedicated init flow, no fake messages, grounded in real data
- [ ] Retrieval: existing entity detection + parallel queries + pinned chunks preserved
- [ ] NEW: focus-aware metadata filter query added to retrieval
- [ ] NEW: persona-aware re-ranking applied after collection
- [ ] NEW: detail hydration for qa_summary chunks
- [ ] Dynamic system prompt: existing rules preserved + persona tone + focus highlighting
- [ ] First-person voice preserved (AI speaks as DJ)
- [ ] Bilingual support preserved (EN/KO language detection)
- [ ] visitorData validated server-side on every request
- [ ] Existing in-memory rate limiting preserved (15 req/min)
- [ ] `maxDuration = 30` preserved
- [ ] Error handling degrades gracefully
- [ ] Privacy guardrails prevent leaking sensitive info
- [ ] Suggested questions adapt to persona + language

### Phase 4: Analytics
- [ ] Structured logging via console.log("[ANALYTICS]", ...) for v1
- [ ] Feedback buttons (thumbs up/down) on each assistant response
- [ ] Knowledge gap detection from low retrieval scores
- [ ] Feedback loop drives future Phase 1 capture sessions

---

# IMPLEMENTATION ORDER

Build in this order to get value at each step:

1. **Phase 3 (Chat UI)** — Add Gateway Modal + visitorData to existing working chat. Quickest visible impact.
2. **Phase 1 (Capture)** — Start capturing detailed knowledge. This is the content bottleneck.
3. **Phase 2 (Indexing)** — Once you have 20+ entries, run the unified indexing script.
4. **Phase 3 (Retrieval)** — Add focus-filtering, re-ranking, and detail hydration to the API route.
5. **Phase 4 (Analytics)** — Add logging and feedback after the chat is live.

Each phase is independently deployable. The existing chat continues working throughout.

---

Please provide the complete, production-ready TypeScript code for all files listed in the file structure. Use strict typing (no `any`), Tailwind CSS 4 conventions, and handle every edge case noted. Follow the existing code patterns (useChat with sendMessage, streamText with google(), entity-detection, Map-based chunk collection).
