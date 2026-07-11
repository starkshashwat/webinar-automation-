// =====================================================================
// AI Provider Abstraction — provider-agnostic interface
// =====================================================================

export interface ChatMessageInput {
    role: 'user' | 'assistant'
    content: string
}

export interface ChatCompletionParams {
    systemPrompt: string
    messages: ChatMessageInput[]
    contextChunks: string[]
    temperature?: number
    maxTokens?: number
}

export interface AIProvider {
    chatCompletion(params: ChatCompletionParams): Promise<string>
    embed(text: string): Promise<number[]>
    embedBatch(texts: string[]): Promise<number[][]>
}

// Factory: returns the configured provider (default: OpenAI)
export function getAIProvider(): AIProvider {
    const provider = process.env.AI_PROVIDER ?? 'openai'
    switch (provider) {
        case 'openai':
            // Lazy import to avoid loading the SDK in non-AI contexts
            const { OpenAIProvider } = require('./openai')
            return new OpenAIProvider()
        default:
            throw new Error(`Unknown AI provider: ${provider}`)
    }
}
