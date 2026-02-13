Act as a Principal Full-Stack AI Engineer and UX Expert. I am building a "Chat with my Resume" app using Next.js 14 (App Router), Vercel AI SDK, Tailwind CSS, and Pinecone.

I want to implement an "Intent-Driven RAG" feature. Before the user can chat, they must pass through a "Gateway Modal" that captures their persona and technical focus. We will use this data to tune the UI, the Vector Retrieval, and the LLM System Prompt.

Please write the complete React and Next.js code for the following 3 steps:

### STEP 1: The Gateway Modal UI (Frontend)
Create a `<WelcomeModal />` component.
- Visuals: Full-screen, dark blurred backdrop (bg-zinc-900/80 backdrop-blur-md), centered sleek white card with a subtle shadow (Vercel/Linear aesthetic).
- Question 1: "How do you identify?" -> Show selectable sleek pills: ["Technical Recruiter", "Engineering Manager", "Startup Founder", "Fellow Developer"].
- Question 2: "What is your primary focus for this role?" -> Show selectable pills: ["Frontend / UI", "Backend / Systems", "AI / LLMs", "Full-Stack"].
- Action: A "Start Interviewing AI" button (disabled until both are selected).
- State: When clicked, save these two selections to a React state object `visitorData` and hide the modal to reveal the chat.

### STEP 2: State Management & The "Magic" Cold Start (Frontend page.tsx)
- Integrate the `WelcomeModal` into the main chat page.
- Update the Vercel AI SDK `useChat` hook to pass the `visitorData` to the backend on every request using the `body` parameter: `useChat({ api: '/api/chat', body: { visitorData } })`.
- **The Magic Cold Start:** The moment the user clicks "Start" in the modal, use the `append` function from the `useChat` hook to silently send an invisible system command as the first message: "System Init: The user is a [Persona] looking for [Focus]. Give a brief, 2-sentence personalized welcome acknowledging their role and summarizing Alex's fit for this specific profile." (Ensure this initial trigger message is hidden from the UI, but display the AI's response).

### STEP 3: The API Route (app/api/chat/route.ts)
Write the Next.js POST handler. Implement the following two architectural RAG adjustments based on the incoming `visitorData`:

1. QUERY EXPANSION (For Retrieval):
Extract the `visitorData` from the request. When creating the OpenAI embedding for the user's last message, silently append their focus area to bias the vector search. 
- Example logic: `const searchString = visitorData ? ${lastMessage} (Focusing heavily on aspects related to: ${visitorData.focus}) : lastMessage;`
- Query Pinecone with the embedding of `searchString`.

2. DYNAMIC SYSTEM PROMPT (For Generation):
Construct a dynamic System Prompt using template literals based on `visitorData.persona`.
- Tone Rules: If `persona === 'Engineering Manager' or 'Fellow Developer'`, instruct the AI to be highly technical, focusing on architecture, system design, and trade-offs. If `persona === 'Technical Recruiter'`, instruct the AI to focus on business impact, cross-functional collaboration, and years of experience, avoiding deep code jargon.
- Highlight Rules: Instruct the AI to heavily highlight context related to the `visitorData.focus`. 
- Anti-Hallucination Guardrail: "You must ONLY use the provided context chunks. If Alex's resume context does not contain experience in their requested focus area or question, explicitly state 'I don't see specific details about that in his resume' and pivot to his actual core strengths."

Please provide the exact Next.js page structure (`page.tsx`), the `WelcomeModal` component, and the updated `api/chat/route.ts`. Ensure the code is strictly typed using TypeScript interfaces, uses modern Tailwind conventions, and is production-ready.