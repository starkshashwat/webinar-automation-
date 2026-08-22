import { type AIResource, type AIConfidence, type AIResponseMode } from '@/types/ai';

export interface GuardrailValidationInput {
  rawResponse: string | null;
  confidence: AIConfidence;
  responseMode: AIResponseMode;
  matchedResourceId?: string | null;
  activeResources: AIResource[];
  isPrivateIntentDetected?: boolean;
  webinar?: any;
}

export interface GuardrailValidationResult {
  finalResponse: string | null;
  finalResponseMode: AIResponseMode;
  confidence: AIConfidence;
  isValid: boolean;
  sanitized: boolean;
  reason?: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export function applyGuardrails(input: GuardrailValidationInput): GuardrailValidationResult {
  const {
    rawResponse,
    confidence,
    responseMode,
    matchedResourceId,
    activeResources,
    isPrivateIntentDetected,
    webinar
  } = input;

  if (!rawResponse || responseMode === 'no_response') {
    return {
      finalResponse: null,
      finalResponseMode: 'no_response',
      confidence,
      isValid: true,
      sanitized: false,
    };
  }

  let sanitizedText = rawResponse.trim();
  let finalMode = responseMode;

  // Enforce private mode if private intent was flagged
  if (isPrivateIntentDetected && finalMode !== 'private') {
    finalMode = 'private';
  }

  // Handle LOW confidence: Silent by default (never hallucinate or guess)
  if (confidence === 'LOW') {
    return {
      finalResponse: null,
      finalResponseMode: 'no_response',
      confidence: 'LOW',
      isValid: true,
      sanitized: true,
      reason: 'Low confidence ignored (Silent by default)',
    };
  }

  // Anti-URL Hallucination Check
  // 1. If a resource was matched, find its approved URL
  let matchedResourceUrl: string | null = null;
  if (matchedResourceId) {
    const matched = activeResources.find((r) => r.id === matchedResourceId || r.name.toLowerCase() === matchedResourceId.toLowerCase());
    if (matched) {
      matchedResourceUrl = matched.url;
    }
  }

  // 2. Scan for any URLs in the text
  const detectedUrls = sanitizedText.match(URL_REGEX) || [];
  const approvedUrls = activeResources.map((r) => r.url.trim().toLowerCase());

  // Also approve the webinar's direct course URL if set
  if (webinar?.course_url) {
    approvedUrls.push(webinar.course_url.trim().toLowerCase());
  }

  // Also approve any URLs explicitly configured in the broadcast prompt
  if (webinar?.ai_cta_broadcast_prompt) {
    const promptUrls = (webinar.ai_cta_broadcast_prompt as string).match(URL_REGEX) || [];
    for (const pUrl of promptUrls) {
      approvedUrls.push(pUrl.trim().toLowerCase());
    }
  }

  for (const url of detectedUrls) {
    const cleanUrl = url.replace(/[),.;]+$/, ''); // strip trailing punctuation
    const isApproved = approvedUrls.some((appUrl) => cleanUrl.toLowerCase().includes(appUrl) || appUrl.includes(cleanUrl.toLowerCase()));

    if (!isApproved) {
      // Remove or replace the hallucinated URL with valid course URL or matched resource
      if (matchedResourceUrl) {
        sanitizedText = sanitizedText.replace(url, matchedResourceUrl);
      } else if (webinar?.course_url) {
        sanitizedText = sanitizedText.replace(url, webinar.course_url);
      } else {
        sanitizedText = sanitizedText.replace(url, '');
      }
    }
  }

  // Clean up any remaining placeholder artifacts
  sanitizedText = sanitizedText.replace(/\[(?:link provided in webinar description|link provided|link|url|current url|current webinar course url|payment link)\]/gi, webinar?.course_url || '');

  // 3. If matched resource URL is known and not yet present in text, append it cleanly
  if (matchedResourceUrl && !sanitizedText.includes(matchedResourceUrl)) {
    sanitizedText = `${sanitizedText}\n\nHere is the link: ${matchedResourceUrl}`;
  }

  return {
    finalResponse: sanitizedText,
    finalResponseMode: finalMode,
    confidence,
    isValid: true,
    sanitized: true,
  };
}
