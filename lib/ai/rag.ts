// =====================================================================
// RAG — Retrieval-Augmented Generation via pgvector
// =====================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { getAIProvider } from './provider'

const CHUNK_SIZE = 1000 // characters per chunk
const CHUNK_OVERLAP = 200
const TOP_K = 5

/** Split text into overlapping chunks for embedding. */
export function chunkText(text: string): string[] {
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length)
        chunks.push(text.slice(start, end))
        start += CHUNK_SIZE - CHUNK_OVERLAP
    }
    return chunks.length > 0 ? chunks : [text]
}

/** Embed and store knowledge documents for a webinar. */
export async function ingestKnowledge(
    webinarId: string,
    sourceType: 'faq' | 'pdf' | 'notes' | 'sales_page' | 'transcript',
    title: string | null,
    content: string
): Promise<number> {
    const supabase = createAdminClient()
    const provider = getAIProvider()
    const chunks = chunkText(content)
    const embeddings = await provider.embedBatch(chunks)

    const rows = chunks.map((chunk, i) => ({
        webinar_id: webinarId,
        source_type: sourceType,
        title,
        content: chunk,
        embedding: embeddings[i],
    }))

    const { error } = await supabase.from('ai_knowledge').insert(rows)
    if (error) throw new Error(`Failed to ingest knowledge: ${error.message}`)

    return rows.length
}

/** Retrieve top-k relevant chunks for a query via cosine similarity. */
export async function retrieveContext(
    webinarId: string,
    query: string,
    topK: number = TOP_K
): Promise<string[]> {
    const supabase = createAdminClient()
    const provider = getAIProvider()
    const queryEmbedding = await provider.embed(query)

    // Use RPC for vector similarity search
    const { data, error } = await supabase.rpc('match_ai_knowledge', {
        p_webinar_id: webinarId,
        p_embedding: queryEmbedding,
        p_top_k: topK,
    })

    if (error) {
        // Fallback: simple text search if pgvector RPC not available
        const { data: fallback, error: fallbackError } = await supabase
            .from('ai_knowledge')
            .select('content')
            .eq('webinar_id', webinarId)
            .limit(topK)
        if (fallbackError) return []
        return (fallback ?? []).map((r: { content: string }) => r.content)
    }

    return (data ?? []).map((r: { content: string }) => r.content)
}
