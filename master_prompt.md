Role: Act as a Principal Full-Stack Engineer and Next.js Expert.

Goal: Scaffolding a RAG-based portfolio application called "Chat with my Resume". The goal is to allow recruiters to ask natural language questions about my professional history and get accurate, context-aware answers without hallucinations.

The Tech Stack:

Framework: Next.js 14+ (App Router, TypeScript).

Styling: Tailwind CSS (modern, clean, minimal).

AI/RAG: Vercel AI SDK (Core), OpenAI (gpt-4o-mini for generation, text-embedding-3-small for embeddings).

Vector DB: Pinecone (Serverless).

Package Manager: npm or pnpm.

The Architecture (Critical):
We are NOT parsing PDFs or using standard sliding-window chunking, as this destroys context. We are using a "Contextual Injection" strategy:

Source of Truth: A structured JSON file (data/resume.json) containing atomic "bullet points" of experience.

Ingestion: A script that "flattens" the JSON. It physically concatenates the parent metadata (Company, Role, Date) into the text before embedding it.

Example: Context: Senior Engineer at Google (2020-2024). Content: Reduced API latency by 30% using Python.

Retrieval: The LLM receives this "enriched" text so it can answer questions like "Did he use Python at Google?" accurately.

Immediate Task: Phase 1 Implementation
Please generate the project structure and the core files. Specifically:

data/resume.json: Create a sample JSON file with the following schema: id, text (the bullet point), and metadata (object with role, company, type, dates). Add 3-4 dummy entries covering work experience and a side project.

scripts/ingest.ts (or .mjs): A script to read the JSON, generate embeddings via OpenAI, and upsert them to Pinecone. Crucial: Ensure the script constructs the "Enriched Text" (combining metadata + text) before embedding, as described in the architecture.

app/api/chat/route.ts: The API route.

Embed the user's query.

Query Pinecone for the top 3-4 matches.

Construct a context block from the retrieved "enriched" text.

Use the Vercel AI SDK (streamText) to stream the response back to the client.

System Prompt: "You are a helpful Recruiter Assistant. Answer based ONLY on the context provided. If the answer is not in the context, say you don't know."

app/page.tsx: A clean, modern, single-page Chat UI.

Use the useChat hook from Vercel AI SDK.

Include a welcome message and a list of "Suggested Questions" (chips) above the input bar (e.g., "Tell me about his leadership", "What is his tech stack?").

Style it to look professional (e.g., "Recruiter" vs "Assistant" message bubbles).