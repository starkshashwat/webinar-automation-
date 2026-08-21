import { type Intent, type AIConfidence, type AIResponseMode, type AIClassificationResult } from '@/types/ai';

// Patterns that indicate a private/sensitive user issue that MUST be answered privately
const PRIVATE_INTENT_PATTERNS = [
  /\b(already\s+paid|made\s+payment|payment\s+done|money\s+deducted|transaction\s+failed|refund|invoice|receipt)\b/i,
  /\b(didn't\s+get\s+access|no\s+access|login\s+issue|password|otp|email\s+not\s+received|verify\s+my\s+email)\b/i,
  /\b(my\s+account|check\s+my|my\s+registration|my\s+order|phone\s+number)\b/i,
];

export function shouldIgnoreMessage(message: string): boolean {
  if (!message || message.trim().length === 0) return true;
  const trimmed = message.trim();
  
  // Ignore single characters or purely punctuation
  if (trimmed.length <= 1) return true;

  return false;
}

export function detectPrivateIntent(message: string): boolean {
  return PRIVATE_INTENT_PATTERNS.some((pattern) => pattern.test(message));
}

export function classifyTrivial(message: string): AIClassificationResult | null {
  if (shouldIgnoreMessage(message)) {
    return {
      shouldIgnore: true,
      intent: 'ENGAGEMENT',
      confidence: 'HIGH',
      responseMode: 'no_response',
      reason: 'Message matches trivial engagement, noise, or pure number/URL pattern',
    };
  }
  return null;
}
