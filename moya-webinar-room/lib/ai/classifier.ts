import { type Intent, type AIConfidence, type AIResponseMode, type AIClassificationResult } from '@/types/ai';

// Common trivial words and greetings to ignore immediately
const IGNORE_PATTERNS = [
  /^(hi|hello|hey|heyy|heya|yo|namaste|hola|sir|mam|ma'am)\b/i,
  /^(thanks|thank\s*you|thx|tysm|dhanyawad)\b/i,
  /^(yes|no|yeah|yep|nope|ok|okay|k|sure|cool|great|nice|awesome|good|super|amazing|wow|done|ready)\b/i,
  /^[\p{Emoji}\s\p{Punctuation}]+$/u, // only emojis, punctuation, or spaces
  /^\d+$/, // pure numbers like "1", "2"
  /(https?:\/\/[^\s]+)/gi, // if they just post a URL (channel sharing) - wait, maybe they ask about a URL, let's keep it simple: if the entire message is a URL
  /^https?:\/\/[^\s]+$/gi,
];

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

  // Test against ignore patterns
  return IGNORE_PATTERNS.some((pattern) => pattern.test(trimmed));
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
