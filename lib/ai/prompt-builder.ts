// =====================================================================
// Prompt Builder — assembles offer-aware system prompt for AI Host
// =====================================================================

import type { AiInstructions, Offer } from '@/types/database'

export interface PromptBuildContext {
    instructions: AiInstructions | null
    offer: Offer | null
    offerLive: boolean
    webinarTitle: string
}

/** Build the full system prompt including personality, rules, and offer directive. */
export function buildSystemPrompt(ctx: PromptBuildContext): string {
    const { instructions, offer, offerLive, webinarTitle } = ctx

    const parts: string[] = []

    // Base system prompt
    if (instructions?.system_prompt) {
        parts.push(instructions.system_prompt)
    } else {
        parts.push(
            `You are the AI Host for the webinar "${webinarTitle}". ` +
            'You answer attendee questions privately and helpfully. ' +
            'You are knowledgeable, friendly, and concise.'
        )
    }

    // Personality
    if (instructions?.personality) {
        parts.push(`\n## Personality\n${instructions.personality}`)
    }

    // Rules
    if (instructions?.rules) {
        parts.push(`\n## Rules\n${instructions.rules}`)
    }

    // Sales copy
    if (instructions?.sales_copy) {
        parts.push(`\n## Sales Copy Reference\n${instructions.sales_copy}`)
    }

    // Offer directive — the critical offer-aware piece
    if (offer) {
        if (offerLive) {
            parts.push(
                `\n## OFFER IS LIVE\n` +
                `The special offer is now available!\n` +
                `Offer: ${offer.title}\n` +
                `Button text: ${offer.button_text}\n` +
                `Encourage the attendee to enroll now using the payment button. ` +
                `Be enthusiastic but not pushy. Mention the value and urgency.`
            )
        } else {
            parts.push(
                `\n## OFFER NOT YET LIVE\n` +
                `The offer "${offer.title}" will be revealed later in the webinar. ` +
                `Do NOT encourage purchase yet. If asked about pricing or enrollment, ` +
                `say the details will be shared during the session. Keep focus on the content.`
            )
        }
    }

    return parts.join('\n')
}
