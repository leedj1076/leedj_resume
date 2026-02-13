import { streamText, embed, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { getResumeIndex } from "@/lib/pinecone";
import { detectCompany } from "@/lib/entity-detection";

// IDs that should always be included as context
const PINNED_IDS = [
  "narrative-career-trajectory",
  "exp-dug-overview",
  "personal-summary",
];

interface ChunkRecord {
  id: string;
  enrichedText: string;
  depth: string;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Get the latest user message text
  const lastMessage = messages[messages.length - 1];
  const query =
    lastMessage.content ??
    lastMessage.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join(" ") ??
    "";

  // 2. Detect company entity in query
  const detectedCompany = detectCompany(query);

  // 3. Embed the query
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: query,
  });

  const index = getResumeIndex();
  const ns = index.namespace("resume");

  // 4. Fetch chunks — 3 parallel sources when company detected, 2 otherwise
  const chunks = new Map<string, ChunkRecord>();

  if (detectedCompany) {
    // Hybrid retrieval: semantic + metadata filter + pinned — all in parallel
    const [semanticResults, companyResults, pinnedResults] = await Promise.all([
      ns.query({
        vector: embedding,
        topK: 5,
        includeMetadata: true,
      }),
      ns.query({
        vector: embedding,
        topK: 20,
        includeMetadata: true,
        filter: { company: { $eq: detectedCompany } },
      }),
      ns.fetch({ ids: PINNED_IDS }),
    ]);

    // Add pinned chunks first (highest priority)
    for (const id of PINNED_IDS) {
      const record = pinnedResults.records[id];
      if (record?.metadata?.enrichedText) {
        chunks.set(id, {
          id,
          enrichedText: record.metadata.enrichedText as string,
          depth: (record.metadata.depth as string) ?? "surface",
        });
      }
    }

    // Add all company-filtered chunks (guaranteed complete for that company)
    for (const match of companyResults.matches) {
      if (!chunks.has(match.id) && match.metadata?.enrichedText) {
        chunks.set(match.id, {
          id: match.id,
          enrichedText: match.metadata.enrichedText as string,
          depth: (match.metadata.depth as string) ?? "surface",
        });
      }
    }

    // Add semantic results (may include cross-cutting chunks)
    for (const match of semanticResults.matches) {
      if (!chunks.has(match.id) && match.metadata?.enrichedText) {
        chunks.set(match.id, {
          id: match.id,
          enrichedText: match.metadata.enrichedText as string,
          depth: (match.metadata.depth as string) ?? "surface",
        });
      }
    }
  } else {
    // No company detected: standard semantic search + pinned
    const [semanticResults, pinnedResults] = await Promise.all([
      ns.query({
        vector: embedding,
        topK: 10,
        includeMetadata: true,
      }),
      ns.fetch({ ids: PINNED_IDS }),
    ]);

    // Add pinned chunks first
    for (const id of PINNED_IDS) {
      const record = pinnedResults.records[id];
      if (record?.metadata?.enrichedText) {
        chunks.set(id, {
          id,
          enrichedText: record.metadata.enrichedText as string,
          depth: (record.metadata.depth as string) ?? "surface",
        });
      }
    }

    // Add semantic results
    for (const match of semanticResults.matches) {
      if (!chunks.has(match.id) && match.metadata?.enrichedText) {
        chunks.set(match.id, {
          id: match.id,
          enrichedText: match.metadata.enrichedText as string,
          depth: (match.metadata.depth as string) ?? "surface",
        });
      }
    }
  }

  // 5. Assemble structured context — separate overview from deep-dive
  const overviewChunks: string[] = [];
  const deepDiveChunks: string[] = [];

  for (const chunk of chunks.values()) {
    if (chunk.depth === "deep_dive") {
      deepDiveChunks.push(chunk.enrichedText);
    } else {
      overviewChunks.push(chunk.enrichedText);
    }
  }

  let context = "--- OVERVIEW ---\n" + overviewChunks.join("\n\n");
  if (deepDiveChunks.length > 0) {
    context +=
      "\n\n--- DETAILED STORIES (for follow-up depth) ---\n" +
      deepDiveChunks.join("\n\n");
  }
  context += "\n--- END RESUME ---";

  // 6. Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(messages);

  // 7. Stream response with context injection
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are the professional whose resume is provided below. Answer questions as if you are speaking about yourself in first person ("I", "my", "me").
Be warm, conversational, and natural — like you're chatting with a recruiter over coffee.
Use a friendly but professional tone. Stay grounded in the facts from your resume.

RESPONSE DEPTH — this is critical:
- INITIAL or NEW TOPIC question: Give a **comprehensive overview** using the OVERVIEW section (4-6 bullet points covering ALL major aspects). Hit ALL the highlights so the recruiter gets a complete picture, and invite follow-up.
- FOLLOW-UP question (same topic as previous exchange): Go **deeper** — use the DETAILED STORIES section to share specific stories, metrics, negotiation details, and nuances. Be thorough and engaging.
- When the user switches to an UNRELATED topic: **reset to overview level** again.
- How to tell: if the user's question clearly relates to what was just discussed (e.g. "tell me more", "what about...", "how did you...", or referencing the same company/role/skill), treat it as a follow-up. Otherwise, treat it as a new topic.

CONTEXT STRUCTURE:
- The OVERVIEW section contains surface-level facts — use these for initial answers to ensure completeness.
- The DETAILED STORIES section contains in-depth stories with specific metrics, negotiation details, and lessons learned — use these for follow-up depth.

LANGUAGE: Detect the language of each user message and respond in the SAME language.
- If the user writes in Korean, respond entirely in Korean.
- If the user writes in English, respond entirely in English.

FORMAT YOUR RESPONSES for easy scanning:
- Use **bold** for company names, job titles, and key highlights
- Use bullet points to list achievements, skills, or multiple items
- Use short paragraphs — never a wall of text
- When covering multiple roles or topics, separate them with a brief heading or line break
- Lead with the most relevant/impressive point first

If the question cannot be answered from the context:
- In English: say something like "That's not something covered in my background — happy to chat more about what I do bring to the table though!"
- In Korean: say something like "그 부분은 제 이력서에 포함되어 있지 않지만, 제가 가진 다른 역량에 대해 더 이야기해 드릴 수 있습니다!"
Do not fabricate experience, skills, or details that are not in the context.

--- MY RESUME ---
${context}`,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
