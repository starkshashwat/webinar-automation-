// =====================================================================
// OpenAI Provider — implements AIProvider using the OpenAI SDK
// =====================================================================

import OpenAI from 'openai'
import type { AIProvider, ChatCompletionParams } from './provider'

export class OpenAIProvider implements AIProvider {
    private client: OpenAI
    private chatModel: string
    private embedModel: string

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
        })
        this.chatModel = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o'
        this.embedModel = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small'
    }

    async chatCompletion(params: ChatCompletionParams): Promise<string> {
        const { systemPrompt, messages, contextChunks, temperature = 0.7, maxTokens = 500 } = params

        const contextBlock =
            contextChunks.length > 0
                ? `\n\n## Relevant Knowledge\n${contextChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}`
                : ''

        const fullSystem = `${systemPrompt}${contextBlock}`

        const response = await this.client.chat.completions.create({
            model: this.chatModel,
            temperature,
            max_tokens: maxTokens,
            messages: [
                { role: 'system', content: fullSystem },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
        })

        return response.choices[0]?.message?.content ?? ''
    }

    async embed(text: string): Promise<number[]> {
        const response = await this.client.embeddings.create({
            model: this.embedModel,
            input: text,
        })
        return response.data[0].embedding
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return []
        const response = await this.client.embeddings.create({
            model: this.embedModel,
            input: texts,
        })
        return response.data.map((d) => d.embedding)
    }
}
