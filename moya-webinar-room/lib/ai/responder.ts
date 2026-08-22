import { createAdminClient } from '@/lib/supabase/server';

import { 
  type AISettings, 
  type AIKnowledge, 
  type AIResource, 
  type AIResponseResult 
} from '@/types/ai';
import { type ChatMessage } from '@/types/chat';
import { applyGuardrails } from './guardrails';
import { detectPrivateIntent } from './classifier';
import { getAIProvider } from './providers';

// --- TTL CACHE FOR DATABASE READS ---
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}
// ------------------------------------

export async function getAISettings(): Promise<AISettings> {
  const cached = getCached<AISettings>('settings');
  if (cached) return cached;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .limit(1)
    .single();

  if (data) {
    setCache('settings', data);
    return data as AISettings;
  }

  const fallback = {
    id: '00000000-0000-0000-0000-000000000001',
    ai_name: 'MOYA Webinar Assistant',
    provider: 'nvidia',
    api_key: process.env.NVIDIA_API_KEY || process.env.AI_API_KEY || null,
    model: process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct',
    system_instructions: 'You are the official webinar assistant. Answer attendee questions clearly and concisely using only the provided webinar knowledge. Never invent information or URLs.',
    is_enabled_globally: true,
  } as AISettings;
  
  setCache('settings', fallback);
  return fallback;
}

export async function getActiveKnowledge(webinarId: string): Promise<AIKnowledge[]> {
  const cacheKey = `knowledge_${webinarId}`;
  const cached = getCached<AIKnowledge[]>(cacheKey);
  if (cached) return cached;

  const supabase = createAdminClient();
  
  // Fetch entries specific to this webinar OR global (webinar_id is null)
  const { data, error } = await supabase
    .from('ai_knowledge')
    .select('*')
    .or(`webinar_id.eq.${webinarId},webinar_id.is.null`)
    .eq('active', true);

  if (error || !data) {
    // Fallback check on legacy knowledge_base table if any
    const { data: legacyData } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('webinar_id', webinarId)
      .eq('enabled', true);

    if (legacyData && legacyData.length > 0) {
      const res = legacyData.map((k: any) => ({
        id: k.id,
        webinar_id: k.webinar_id,
        title: k.question,
        content: k.answer,
        active: k.enabled,
      }));
      setCache(cacheKey, res);
      return res;
    }
    return [];
  }

  setCache(cacheKey, data);
  return data as AIKnowledge[];
}

export async function getActiveResources(webinarId: string): Promise<AIResource[]> {
  const cacheKey = `resources_${webinarId}`;
  const cached = getCached<AIResource[]>(cacheKey);
  if (cached) return cached;

  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('ai_resources')
    .select('*')
    .or(`webinar_id.eq.${webinarId},webinar_id.is.null`)
    .eq('active', true);

  if (error || !data) return [];
  
  setCache(cacheKey, data);
  return data as AIResource[];
}

export async function generateAIResponse({
  webinar,
  session,
  settings,
  knowledge,
  resources,
  context,
  latestMessage,
  recentHostMessage
}: {
  webinar: any;
  session?: any;
  settings: AISettings;
  knowledge: AIKnowledge[];
  resources: AIResource[];
  context: ChatMessage[];
  latestMessage: ChatMessage;
  recentHostMessage?: ChatMessage;
}): Promise<AIResponseResult> {
  const apiKey = settings.api_key || process.env.AI_API_KEY;
  if (!apiKey) {
    return {
      intent: 'GENERAL',
      confidence: 'LOW',
      responseMode: 'no_response',
      response: null,
      status: 'failed',
      errorMessage: 'AI API Key is missing in settings and environment.',
    };
  }

  const isPrivateByPattern = detectPrivateIntent(latestMessage.message);

  const kbFormatted = knowledge.length > 0 
    ? knowledge.map((k, i) => `[Entry ${i + 1}] Title: ${k.title}\nContent: ${k.content}`).join('\n\n')
    : '(No custom knowledge base entries configured. Rely strictly on webinar details.)';

  const resourcesFormatted = resources.length > 0
    ? resources.map((r) => `- Resource ID: "${r.id}" | Name: "${r.name}" | Description: "${r.description || ''}" | URL: "${r.url}"`).join('\n')
    : '(No approved resources configured)';

  const historyFormatted = context
    .map((m) => `[${m.message_type}] ${m.sender_name}: ${m.message}`)
    .join('\n');

  const hostContext = recentHostMessage 
    ? `\n# RECENT HOST/SYSTEM CONTEXT:\nSender: ${recentHostMessage.sender_name}\nMessage: "${recentHostMessage.message}"\nUse this to evaluate if the attendee is simply engaging with a host prompt.` 
    : '';

  // Calculate Course Pitch gating logic
  let courseSalesLocked = false;
  if (webinar.course_pitch_enabled) {
    const isLive = webinar.status === 'LIVE' || webinar.status === 'live';
    if (!isLive) {
      courseSalesLocked = true;
    } else {
      const effectiveStart = webinar.actual_start_at
        ? new Date(webinar.actual_start_at).getTime()
        : webinar.scheduled_start
        ? new Date(webinar.scheduled_start).getTime()
        : session?.started_at
        ? new Date(session.started_at).getTime()
        : webinar.started_at
        ? new Date(webinar.started_at).getTime()
        : Date.now();
      const delayMs = ((webinar.course_pitch_delay_minutes || 0) * 60000) + ((webinar.course_pitch_delay_seconds || 0) * 1000);
      const unlockTime = effectiveStart + delayMs;
      
      if (Date.now() < unlockTime) {
        courseSalesLocked = true;
      }
    }
  }

  // Resolve the exact course URL from Webinar Settings (Single Source of Truth)
  let exactCourseUrl = webinar.course_url?.trim() || '';
  if (!exactCourseUrl && webinar.ai_cta_broadcast_prompt) {
    const urlMatch = (webinar.ai_cta_broadcast_prompt as string).match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      exactCourseUrl = urlMatch[0].replace(/[),.;]+$/, '');
    }
  }

  const stageHeader = courseSalesLocked 
    ? 'PRE-PITCH ACTIVE (Course details, pricing, discounts, and payment links are LOCKED)' 
    : 'POST-PITCH ACTIVE (Course details, pricing, bonuses, and payment links are UNLOCKED)';

  const pitchGuidance = courseSalesLocked
    ? (settings.pre_pitch_prompt 
        ? `\n# ACTIVE PRE-PITCH INSTRUCTIONS (FROM ADMIN SETTINGS):\n${settings.pre_pitch_prompt}\n` 
        : `\n# ACTIVE PRE-PITCH INSTRUCTIONS:\n- Course information, pricing, discounts, and payment links are STRICTLY LOCKED.\n- If attendee asks about course purchase, fees, bonuses, or links, gracefully deflect them or stay silent.\n- If attendee asks a genuine non-course question about the webinar topic that is answered in the Approved Knowledge Base, you MAY answer using the Knowledge Base.\n`)
    : (settings.post_pitch_prompt
        ? `\n# ACTIVE POST-PITCH INSTRUCTIONS (FROM ADMIN SETTINGS):\n${settings.post_pitch_prompt}\n`
        : `\n# ACTIVE POST-PITCH INSTRUCTIONS:\n- Course information, pricing, bonuses, and enrollment are UNLOCKED.\n- Answer attendee questions using the Approved Knowledge Base and provide the official course link: "${exactCourseUrl}".\n`);

  const ignoreRulesSection = settings.ignore_rules
    ? `\n# STEP 1 — IGNORE RULES EVALUATION (FROM ADMIN SETTINGS):\n${settings.ignore_rules}\n`
    : '';

  const systemInstruction = `
${settings.system_instructions || 'You are the official AI webinar host.'}

# CURRENT WEBINAR STATUS:
- Title: "${webinar.title}"
- Stream Stage: ${stageHeader}
- Official Course / Payment URL: "${exactCourseUrl || '(No URL configured)'}"
${hostContext}
${ignoreRulesSection}
${pitchGuidance}

# APPROVED KNOWLEDGE BASE (SINGLE FACTUAL SOURCE OF TRUTH):
${kbFormatted}

# APPROVED RESOURCES & LINKS (NEVER FABRICATE LINKS OUTSIDE THIS LIST):
${resourcesFormatted}

# CRITICAL 3-STEP DECISION PIPELINE:

STEP 1: IGNORE CLASSIFICATION
- First, evaluate the latest attendee message strictly against the "IGNORE RULES" above.
- If the message matches ANY ignore criteria (e.g., poll responses, greetings, thank yous, generic open-ended queries, duplicate messages, spam):
  → You MUST set "intent": "ENGAGEMENT", "response_mode": "no_response", "response": null.

STEP 2: PITCH STATE & TOPIC CHECK
- If the message passed Step 1 (genuine attendee query):
  - In PRE-PITCH (${courseSalesLocked}):
    * If attendee asks about course purchase, course price, fees, enrollment, discount, or payment link:
      Follow the Pre-Pitch instructions (Course details are locked. Deflect gracefully or return "no_response"). NEVER provide course price or course URL.
    * If attendee asks a genuine non-course question about the webinar topic: Proceed to Step 3.
  - In POST-PITCH (${!courseSalesLocked}):
    * Follow Post-Pitch instructions. Course details and payment link are unlocked.

STEP 3: KNOWLEDGE BASE GATING (ZERO HALLUCINATION RULE)
- Search the "APPROVED KNOWLEDGE BASE" above for factual information to answer the question.
- IF THE INFORMATION IS NOT IN THE APPROVED KNOWLEDGE BASE:
  → DO NOT invent or make up facts.
  → DO NOT say "refer to webinar description", "check email", or fabricate external links.
  → Set "response_mode": "no_response", "response": null.
- IF FACTUAL INFORMATION EXISTS IN KNOWLEDGE BASE:
  → Set "intent": "GENUINE_QUESTION" (or "PROBLEM" or "RESOURCE_REQUEST").
  → Set "response_mode": "private".
  → Generate a direct, helpful, natural answer matching the attendee's language (Hindi / Hinglish / English).
  → For Course Links: Use ONLY the exact URL: "${exactCourseUrl}".
  → For Support/Other Resources: Use ONLY the URLs listed in APPROVED RESOURCES.
  → NEVER output translation of attendee message. Give the actual helpful answer.
`;

  const userPrompt = `
# RECENT CHAT HISTORY:
${historyFormatted}

# LATEST ATTENDEE MESSAGE TO RESPOND TO:
Sender: "${latestMessage.sender_name}"
Message: "${latestMessage.message}"

Please evaluate this message and output a valid JSON object with this EXACT schema:
{
  "intent": "GENUINE_QUESTION" | "PROBLEM" | "RESOURCE_REQUEST" | "ENGAGEMENT" | "REACTION" | "CHANNEL_SHARE" | "CASUAL" | "UNCLEAR" | "HOST_MESSAGE",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "response_mode": "private" | "no_response",
  "matched_resource_id": string | null,
  "response": string | null
}
`;

  try {
    const provider = getAIProvider(settings);
    return await provider.generateResponse({
      webinar,
      settings,
      systemInstruction,
      userPrompt,
      isPrivateByPattern,
      resources
    });
  } catch (error: any) {
    console.error('[AI Responder] Error generating response:', error);
    return {
      intent: 'GENERAL',
      confidence: 'LOW',
      responseMode: 'no_response',
      response: null,
      status: 'failed',
      errorMessage: error?.message || 'Unknown LLM generation error',
    };
  }
}

/**
 * Generates an on-the-fly proactive AI CTA promotional broadcast message.
 * Molds Knowledge Base facts with Sales Psychology instructions from the broadcaster prompt.
 */
export async function generateAIBroadcastCTA(
  webinar: any,
  settings: AISettings,
  knowledge: AIKnowledge[],
  resources: AIResource[],
  angleInstruction?: string,
  displayType: 'CHAT' | 'BANNER' | 'BOTH' = 'CHAT'
): Promise<string | null> {
  const provider = getAIProvider(settings);
  
  // Format Knowledge Base as raw factual points (not Q&A) so the AI synthesizes them psychologically
  const kbFacts = knowledge.length > 0 
    ? knowledge.map((k) => `• ${k.title}: ${k.content}`).join('\n')
    : 'Approved program details and curriculum from webinar context.';

  const resourcesFormatted = resources.length > 0
    ? resources.map((r) => `- Resource: "${r.name}" (${r.description || ''}) => ${r.url}`).join('\n')
    : '(No extra approved resources)';

  // Resolve the exact payment/course URL strictly from Webinar Settings (Single Source of Truth)
  let exactCourseUrl = webinar.course_url?.trim() || '';
  if (!exactCourseUrl && webinar.ai_cta_broadcast_prompt) {
    const urlMatch = (webinar.ai_cta_broadcast_prompt as string).match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      exactCourseUrl = urlMatch[0].replace(/[),.;]+$/, '');
    }
  }

  const isBanner = displayType === 'BANNER';

  const systemInstruction = `
# ROLE & PRIMARY OBJECTIVE:
You are the high-converting AI Sales Broadcaster for "${webinar.title}".
Your objective is to proactively write persuasive, high-converting Call-To-Action (CTA) promotional messages to broadcast to the live webinar audience.

IMPORTANT: This is NOT a question-answering task. Do NOT output Q&A.
You must take the verified curriculum, benefits, pricing, bonuses, and student results from the "KNOWLEDGE FACTS" below and mold them using the psychological triggers defined in "SALES PSYCHOLOGY & BROADCAST INSTRUCTIONS".

# SALES PSYCHOLOGY & BROADCAST INSTRUCTIONS:
${webinar.ai_cta_broadcast_prompt || settings.post_pitch_prompt || 'Proactively communicate the program value, bonuses, and transformation.'}

# SPECIFIC ROTATING ANGLE FOR THIS BROADCAST WAVE:
${angleInstruction || 'Focus on student transformation, practical skills gained, and why they should enroll now.'}

# KNOWLEDGE FACTS (FACTUAL FOUNDATION):
${kbFacts}

# APPROVED RESOURCES:
${resourcesFormatted}

# FORMATTING & COPYWRITING RULES:
${isBanner ? `
- This message will display as an ON-SCREEN FLASH BANNER / NOTIFICATION.
- Write a high-impact, punchy Headline (1 line) + Brief Urgency/Value Subtext (1-2 lines).
- Keep total length to 2-3 short lines maximum.
` : `
- This message will broadcast directly into the LIVE PUBLIC CHAT.
- Write 3 to 6 short, punchy, conversational lines.
- Use line breaks (Enter) between lines so the message is clean, spacious, and easily readable.
- Apply psychological triggers naturally (e.g. Desire, Social Proof, Value Contrast, Urgency, Risk Reduction).
- End with an inspiring, action-oriented call to action.
`}

# HARDCODED ENROLLMENT LINK:
${exactCourseUrl ? `Official Course URL: "${exactCourseUrl}"` : '(No URL configured)'}
`;

  const userPrompt = `
Please generate the promotional CTA message and output a valid JSON object with this EXACT schema:
{
  "intent": "CTA",
  "confidence": "HIGH",
  "response_mode": "public",
  "matched_resource_id": null,
  "response": "Your persuasive promotional message text here"
}
`;

  try {
    const result = await provider.generateResponse({
      webinar,
      settings,
      systemInstruction,
      userPrompt,
      isPrivateByPattern: false,
      resources: []
    });

    if (result.status === 'processed' && result.response) {
      let text = result.response.trim();
      
      // Clean up any hallucinated placeholder text
      text = text.replace(/\[(?:link provided in webinar description|link provided|link|url|current url|current webinar course url|payment link)\]/gi, '').trim();

      // Ensure the hardcoded link is cleanly separated with Enter / newline and prominent CTA icon
      if (exactCourseUrl) {
        if (text.includes(exactCourseUrl)) {
          // If the link is attached directly to text without newline, insert clean double newline before it
          text = text.replace(new RegExp(`([^\n])\\s*${exactCourseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `$1\n\n👉 ${exactCourseUrl}`);
        } else {
          text += `\n\n👉 ${exactCourseUrl}`;
        }
      }
      return text;
    }

    console.warn('[AI Responder] LLM generation failed (' + (result.errorMessage || 'unknown') + '), using fallback CTA.');
    return exactCourseUrl 
      ? `🚀 Special Webinar Offer is now LIVE!\n\nClick the link below to get instant access:\n\n👉 ${exactCourseUrl}`
      : `🚀 Special Webinar Offer is now LIVE!\n\nDon't miss out on this exclusive opportunity!`;
  } catch (error) {
    console.error('[AI Responder] Failed to generate broadcast CTA:', error);
    return exactCourseUrl 
      ? `🚀 Special Webinar Offer is now LIVE!\n\nClick the link below to get instant access:\n\n👉 ${exactCourseUrl}`
      : `🚀 Special Webinar Offer is now LIVE!\n\nDon't miss out on this exclusive opportunity!`;
  }
}
