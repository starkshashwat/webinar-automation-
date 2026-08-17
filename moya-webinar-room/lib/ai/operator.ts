import { createAdminClient } from '@/lib/supabase/server';
import { defaultWebinarProvider } from '@/lib/webinar/provider';
import { classifyTrivial } from './classifier';
import { getAISettings, getActiveKnowledge, getActiveResources, generateAIResponse } from './responder';
import { type ChatMessage } from '@/types/chat';

export interface ProcessChatMessageParams {
  webinarId?: string;
  sessionId: string;
  attendeeId?: string | null;
  messageId: string;
  message: string;
  senderName: string;
}

export async function processChatMessage(params: ProcessChatMessageParams): Promise<void> {
  const { sessionId, attendeeId, messageId, message, senderName } = params;
  const supabase = createAdminClient();

  try {
    // 1. Fetch Session & Webinar details
    const { data: session, error: sessionError } = await supabase
      .from('webinar_sessions')
      .select('*, webinars(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session || !session.webinars) {
      console.warn('[AI Operator] Session or webinar not found:', sessionId);
      return;
    }

    const webinar = session.webinars as any;
    const webinarId = webinar.id;

    // 2. Verify Webinar status is LIVE or WAITING
    const statusNormalized = (webinar.status || '').toUpperCase();
    if (statusNormalized !== 'LIVE' && statusNormalized !== 'WAITING') {
      console.log(`[AI Operator] Webinar ${webinarId} is not LIVE/WAITING (status: ${webinar.status}). Skipping AI.`);
      return;
    }

    // 3. Verify Webinar AI is enabled
    if (webinar.ai_enabled === false) {
      console.log(`[AI Operator] AI is disabled for webinar ${webinarId}.`);
      return;
    }

    // 4. Fetch AI Settings & check global toggle
    const settings = await getAISettings();
    if (settings.is_enabled_globally === false) {
      console.log('[AI Operator] AI is disabled globally in AI settings.');
      return;
    }

    // 5. Fast Pre-Classification Check (Chit-chat / Emojis)
    const trivialResult = classifyTrivial(message);
    if (trivialResult?.shouldIgnore) {
      // Log as ignored
      await supabase.from('ai_interactions').insert([{
        webinar_id: webinarId,
        session_id: sessionId,
        attendee_id: attendeeId || null,
        chat_message_id: messageId,
        attendee_name: senderName,
        attendee_message: message,
        intent: trivialResult.intent,
        response_mode: 'no_response',
        response: null,
        confidence: trivialResult.confidence,
        status: 'ignored',
      }]);
      console.log('[AI Operator] Ignored trivial chat message:', message);
      return;
    }

    // 6. Fetch Knowledge Base, Resources, and Recent Chat History
    const [knowledge, resources, contextResponse] = await Promise.all([
      getActiveKnowledge(webinarId),
      getActiveResources(webinarId),
      supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const context = ((contextResponse.data || []) as ChatMessage[]).reverse();
    const latestMessage: ChatMessage = {
      id: messageId,
      session_id: sessionId,
      attendee_id: attendeeId || null,
      target_attendee_id: null,
      sender_name: senderName,
      message,
      message_type: 'ATTENDEE',
      created_at: new Date().toISOString(),
    };

    // Find the most recent host message to provide context (e.g. if host just asked for location or 'type 1')
    const recentHostMessage = [...context].reverse().find(m => m.message_type === 'HOST' || m.message_type === 'SYSTEM');

    // 7. Generate Response with LLM & Guardrails
    const result = await generateAIResponse({
      webinar,
      settings,
      knowledge,
      resources,
      context,
      latestMessage,
      recentHostMessage
    });

    // 8. Execute Response if appropriate
    if (result.status === 'processed' && result.response) {
      const aiSenderName = settings.ai_name || 'MOYA Assistant';

      // STRICT PRIVACY ENFORCEMENT: Only ever send private messages.
      if (result.responseMode === 'private' && attendeeId) {
        // Send as a private whisper to the specific attendee
        await defaultWebinarProvider.sendPrivateMessage(
          sessionId,
          attendeeId,
          result.response,
          aiSenderName
        );
      } else {
        // Log that we dropped a message that couldn't be sent privately
        console.log('[AI Operator] Dropped message: responseMode was not private or attendeeId missing.');
      }
    }

    // 9. Store AI Interaction Record for live monitoring and auditing
    await supabase.from('ai_interactions').insert([{
      webinar_id: webinarId,
      session_id: sessionId,
      attendee_id: attendeeId || null,
      chat_message_id: messageId,
      attendee_name: senderName,
      attendee_message: message,
      intent: result.intent,
      response_mode: result.responseMode,
      response: result.response,
      confidence: result.confidence,
      status: result.status,
      error_message: result.errorMessage || null,
    }]);

  } catch (error: any) {
    console.error('[AI Operator Error] Failed processing message:', error);
    try {
      // Best-effort error logging
      await supabase.from('ai_interactions').insert([{
        session_id: sessionId,
        attendee_id: attendeeId || null,
        chat_message_id: messageId,
        attendee_name: senderName,
        attendee_message: message,
        intent: 'GENERAL',
        response_mode: 'no_response',
        confidence: 'LOW',
        status: 'failed',
        error_message: error?.message || 'Unexpected operator failure',
      }]);
    } catch (logErr) {
      console.error('[AI Operator] Failed to log error interaction:', logErr);
    }
  }
}
