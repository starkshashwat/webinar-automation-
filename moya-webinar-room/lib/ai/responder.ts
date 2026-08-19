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
    provider: 'google',
    api_key: process.env.AI_API_KEY || null,
    model: process.env.AI_MODEL || 'gemini-flash-latest',
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
  if (webinar.course_pitch_enabled && session?.started_at) {
    const startedAtTime = new Date(session.started_at).getTime();
    const delayMs = (webinar.course_pitch_delay_minutes || 0) * 60000;
    const unlockTime = startedAtTime + delayMs;
    
    if (Date.now() < unlockTime) {
      courseSalesLocked = true;
    }
  }

  const pitchRestriction = courseSalesLocked ? `
> [!CRITICAL]
> THE COURSE SALES INFORMATION IS CURRENTLY LOCKED. The pitch time has NOT been reached yet.
> DO NOT reveal course pricing, URLs, specific modules, bonuses, or enrollment details under any circumstances.
> If the attendee asks about the course, gracefully deflect them: "The detailed course information will be shared at the appropriate point in the webinar. Please stay with us for the full session." Do not provide any resources.
` : '';

  const systemInstruction = `
${settings.system_instructions}

# WEBINAR CONTEXT:
- Title: "${webinar.title}"
- Description: "${webinar.description || 'Live Masterclass'}"
- Course/Main URL: "${webinar.course_url || ''}"
${hostContext}
${pitchRestriction}

# APPROVED KNOWLEDGE BASE:
${courseSalesLocked ? '(Course knowledge is currently locked. Answer only general webinar questions.)' : kbFormatted}

# APPROVED RESOURCES & LINKS (YOU MUST NEVER FABRICATE ANY LINK OUTSIDE THIS LIST):
${courseSalesLocked ? '(Resources are currently locked)' : resourcesFormatted}

# RULES FOR LIVE WEBINAR OPERATION:
1. You are a silent-by-default operator running behind the scenes.
2. The system must prefer false negatives over false positives. If there is uncertainty about whether a message is a genuine attendee question/problem, set "response_mode" to "no_response".
3. ONLY answer based on the knowledge provided above. NEVER invent facts, prices, promises, or external URLs.
4. Do not respond merely because the message contains a question mark.
5. Do not respond to engagement activities (e.g., "1", "yes", "Delhi" when asked for location). Evaluate the attendee's message against the recent host context.
6. Do not respond to host prompts, audience answers to host prompts, reactions, or channel sharing.
7. Only respond when the attendee clearly requires information, assistance, or an approved resource.
8. Set "intent" to one of: GENUINE_QUESTION, PROBLEM, RESOURCE_REQUEST, ENGAGEMENT, REACTION, CHANNEL_SHARE, CASUAL, UNCLEAR, HOST_MESSAGE.
9. If intent is GENUINE_QUESTION, PROBLEM, or RESOURCE_REQUEST, set "response_mode" to "private".
10. For ALL OTHER INTENTS, set "response_mode" to "no_response" and "response" to null.
11. Whenever you provide a URL or link in your response, you MUST output the raw, literal URL (e.g., https://example.com). Do NOT use placeholders like "[link]" or "click here".
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

  // Resolve the exact payment/course URL:
  // 1. Dedicated webinar.course_url
  // 2. URL embedded in webinar.ai_cta_broadcast_prompt
  // 3. Fallback
  let exactCourseUrl = webinar.course_url?.trim();
  if (!exactCourseUrl && webinar.ai_cta_broadcast_prompt) {
    const urlMatch = (webinar.ai_cta_broadcast_prompt as string).match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      exactCourseUrl = urlMatch[0].replace(/[),.;]+$/, '');
    }
  }
  if (!exactCourseUrl) {
    exactCourseUrl = 'https://moya.com/checkout';
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
You MUST include the exact literal payment/course URL: ${exactCourseUrl}
Do NOT replace this URL with placeholders like "[link provided]", "[link]", or "click here". Output the actual URL.

${customPrompt}
${anglePrompt}
# WEBINAR KNOWLEDGE & CONTEXT:
${kbFormatted}

# APPROVED RESOURCES:
${resourcesFormatted}

GUIDELINES:
1. Make the message compelling, natural, and urgent.
2. Highlight specific bonuses, results, value, or scarcity from the instructions.
3. Keep the message concise (1-3 short paragraphs max).
4. End with the exact URL: ${exactCourseUrl}
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
      return result.response;
    }

    console.warn('[AI Responder] LLM generation failed or key missing (' + (result.errorMessage || 'unknown') + '), using resilient fallback CTA.');
    return `🚨 Special Webinar Offer is now LIVE!\n\nDon't miss out on this exclusive opportunity. Click the link below to get instant access:\n\n👉 ${exactCourseUrl}`;
  } catch (error) {
    console.error('[AI Responder] Failed to generate broadcast CTA:', error);
    return `🚨 Special Webinar Offer is now LIVE!\n\nDon't miss out on this exclusive opportunity. Click the link below to get instant access:\n\n👉 ${exactCourseUrl}`;
  }
}
