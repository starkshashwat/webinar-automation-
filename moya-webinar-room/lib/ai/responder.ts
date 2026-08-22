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

export async function getAISettings(): Promise<AISettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .limit(1)
    .single();

  if (data) return data as AISettings;

  return {
    id: '00000000-0000-0000-0000-000000000001',
    ai_name: 'MOYA Webinar Assistant',
    provider: 'nvidia',
    api_key: process.env.NVIDIA_API_KEY || process.env.AI_API_KEY || null,
    model: process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct',
    system_instructions: 'You are the official webinar assistant. Answer attendee questions clearly and concisely using only the provided webinar knowledge. Never invent information or URLs.',
    is_enabled_globally: true,
  };
}

export async function getActiveKnowledge(webinarId: string): Promise<AIKnowledge[]> {
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
      return legacyData.map((k: any) => ({
        id: k.id,
        webinar_id: k.webinar_id,
        title: k.question,
        content: k.answer,
        active: k.enabled,
      }));
    }
    return [];
  }

  return data as AIKnowledge[];
}

export async function getActiveResources(webinarId: string): Promise<AIResource[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('ai_resources')
    .select('*')
    .or(`webinar_id.eq.${webinarId},webinar_id.is.null`)
    .eq('active', true);

  if (error || !data) return [];
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
 */
export async function generateAIBroadcastCTA(
  webinar: any,
  settings: AISettings,
  knowledge: AIKnowledge[],
  resources: AIResource[],
  angleInstruction?: string
): Promise<string | null> {
  const provider = getAIProvider(settings);
  
  const kbFormatted = knowledge.length > 0 
    ? knowledge.map((k, i) => `[Entry ${i + 1}] Title: ${k.title}\nContent: ${k.content}`).join('\n\n')
    : '(No custom knowledge base entries configured.)';

  const resourcesFormatted = resources.length > 0
    ? resources.map((r) => `- Resource ID: "${r.id}" | Name: "${r.name}" | Description: "${r.description || ''}" | URL: "${r.url}"`).join('\n')
    : '(No approved resources configured)';

  // Resolve the exact payment/course URL strictly from Webinar Settings:
  let exactCourseUrl = webinar.course_url?.trim() || '';
  if (!exactCourseUrl && webinar.ai_cta_broadcast_prompt) {
    const urlMatch = (webinar.ai_cta_broadcast_prompt as string).match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      exactCourseUrl = urlMatch[0].replace(/[),.;]+$/, '');
    }
  }

  const customPrompt = webinar.ai_cta_broadcast_prompt 
    ? `\n# HOST/BROADCAST INSTRUCTIONS & COURSE DETAILS:\n${webinar.ai_cta_broadcast_prompt}\n` 
    : '';

  const anglePrompt = angleInstruction 
    ? `\n# SPECIFIC ANGLE FOR THIS MESSAGE:\n${angleInstruction}\n` 
    : '';

  const systemInstruction = `
You are the official webinar assistant/host for "${webinar.title}".
Your task is to craft a short, engaging, and high-converting Call-To-Action (CTA) promotional message to broadcast into the live webinar public chat.

CRITICAL LINK REQUIREMENT:
${exactCourseUrl ? `You MUST include the exact literal payment/course URL: ${exactCourseUrl}\nDo NOT replace this URL with placeholders like "[link provided in webinar description]" or "[link]". Output the actual URL.` : 'Do not invent any link.'}

${customPrompt}
${anglePrompt}
# WEBINAR KNOWLEDGE & CONTEXT:
${kbFormatted}

# APPROVED RESOURCES:
${resourcesFormatted}

GUIDELINES:
1. Make the message compelling, natural, and persuasive.
2. Highlight specific bonuses, results, value, or scarcity from the instructions.
3. Keep the message concise (3-8 short lines).
4. Ground every claim strictly in the Knowledge Source. NEVER invent prices, fake promises, or unverified claims.
${exactCourseUrl ? `5. If providing a link, include the exact URL: ${exactCourseUrl}` : ''}
`;

  const userPrompt = `
Please generate the promotional CTA message and output a valid JSON object with this EXACT schema:
{
  "intent": "CTA",
  "confidence": "HIGH",
  "response_mode": "public",
  "matched_resource_id": null,
  "response": "Your promotional message text here"
}
`;

  const dummyMessage: ChatMessage = {
    id: 'broadcast-dummy',
    session_id: 'dummy',
    attendee_id: null,
    target_attendee_id: null,
    sender_name: 'SYSTEM',
    message: 'GENERATE_CTA_BROADCAST',
    message_type: 'SYSTEM',
    created_at: new Date().toISOString()
  };

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
      let finalStr = result.response;
      // Clean up any hallucinated placeholder text with the actual course URL
      if (exactCourseUrl) {
        finalStr = finalStr.replace(/\[(?:link provided in webinar description|link provided|link|url|current url|current webinar course url|payment link)\]/gi, exactCourseUrl);
        if (!finalStr.includes(exactCourseUrl)) {
          finalStr += `\n\n👉 ${exactCourseUrl}`;
        }
      }
      return finalStr;
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
