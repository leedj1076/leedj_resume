import { requireAdmin, requireSameOrigin } from "@/lib/server/admin-auth";
import { HttpError, errorResponse, readJsonBody } from "@/lib/server/http";
import { z } from "zod";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { supabase } from "@/lib/supabase";
import { getResumeIndex } from "@/lib/pinecone";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    const parsed = z.object({ exchangeId: z.number().int().positive(), rating: z.enum(["good", "needs_improvement"]), comment: z.string().optional(), improvementText: z.string().optional() }).safeParse(await readJsonBody(req));
    if (!parsed.success) throw new HttpError(400, "invalid_request", "Invalid review");
    const { exchangeId, rating, comment, improvementText } = parsed.data;

    if (!supabase) {
      return new Response(JSON.stringify({ error: "Database not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save the review to Supabase
    const { error: updateError } = await supabase
      .from("chat_exchanges")
      .update({
        dj_rating: rating,
        dj_comment: comment || null,
        improvement_text: improvementText || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", exchangeId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If improvement text provided, upsert correction chunk to Pinecone
    let pineconeChunkId: string | null = null;

    if (improvementText) {
      // Fetch the original query for embedding
      const { data: exchange } = await supabase
        .from("chat_exchanges")
        .select("query")
        .eq("id", exchangeId)
        .single();

      if (exchange?.query) {
        pineconeChunkId = `dj-correction-${exchangeId}`;

        // Embed the original question so similar future queries match this correction
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-large"),
          value: exchange.query.slice(0, 2000),
        });

        const index = getResumeIndex();
        const ns = index.namespace("resume");

        await ns.upsert({
          records: [
            {
              id: pineconeChunkId,
              values: embedding,
              metadata: {
                enrichedText: improvementText,
                section: "dj_correction",
                depth: "surface",
                skills: [],
                is_core_strength: false,
                source: "admin_review",
                original_query: exchange.query.slice(0, 500),
              },
            },
          ],
        });

        // Update the exchange with the Pinecone chunk ID
        await supabase
          .from("chat_exchanges")
          .update({ pinecone_chunk_id: pineconeChunkId })
          .eq("id", exchangeId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, pineconeChunkId }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
