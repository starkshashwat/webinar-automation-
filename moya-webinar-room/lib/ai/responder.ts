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
  settings,
  knowledge,
  resources,
  context,
  latestMessage,
  recentHostMessage
}: {
  webinar: any;
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

  const systemInstruction = `
${settings.system_instructions}

# WEBINAR CONTEXT:
- Title: "${webinar.title}"
- Description: "${webinar.description || 'Live Masterclass'}"
- Course/Main URL: "${webinar.course_url || ''}"
${hostContext}

# APPROVED KNOWLEDGE BASE:
${kbFormatted}

# APPROVED RESOURCES & LINKS (YOU MUST NEVER FABRICATE ANY LINK OUTSIDE THIS LIST):
${resourcesFormatted}

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
