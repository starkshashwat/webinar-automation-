import { createAdminClient } from '../supabase/server';
import { getAISettings, generateAIBroadcastCTA, getActiveKnowledge, getActiveResources } from '../ai/responder';

export async function processAIBroadcasts() {
  const supabase = createAdminClient();

  try {
    // 1. Fetch AI Settings
    const settings = await getAISettings();
    if (settings.is_enabled_globally === false) {
      return { success: true, processed: 0, reason: 'AI globally disabled' };
    }

    // 2. Find all active LIVE sessions where AI is enabled AND course pitch is enabled
    const { data: activeSessions, error } = await supabase
      .from('webinar_sessions')
      .select('*, webinars(*)')
      .eq('status', 'LIVE');

    if (error || !activeSessions || activeSessions.length === 0) {
      return { success: true, processed: 0 };
    }

    let processedCount = 0;

    for (const session of activeSessions) {
      const webinar = session.webinars as any;
      
      // Skip if AI or Course Pitch is disabled
      if (webinar.ai_enabled === false || webinar.course_pitch_enabled === false) {
        continue;
      }

      // Check if the pitch delay time has elapsed
      if (!session.started_at) continue;

      const startedAtTime = new Date(session.started_at).getTime();
      const delayMs = (webinar.course_pitch_delay_minutes || 0) * 60000;
      const unlockTime = startedAtTime + delayMs;

      if (Date.now() < unlockTime) {
        // Pitch is still locked, skip
        continue;
      }

      const maxCount = webinar.ai_cta_broadcast_max_count || 3;
      const batchSize = Math.max(1, Math.min(webinar.ai_cta_broadcast_batch_size || 1, 5));
      const intervalMinutes = webinar.ai_cta_broadcast_interval_minutes || 5;
      const aiName = settings.ai_name || 'MOYA Webinar Assistant';

      const { data: ctaMessages } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('session_id', session.id)
        .eq('message_type', 'CTA')
        .order('created_at', { ascending: false });

      const currentCtaCount = ctaMessages ? ctaMessages.length : 0;
      if (currentCtaCount >= maxCount) {
        // Limit reached, do not broadcast anymore
        continue;
      }

      let shouldBroadcast = false;

      if (!ctaMessages || ctaMessages.length === 0) {
        // Broadcast the first batch immediately when pitch unlocks
        shouldBroadcast = true;
      } else {
        // Wait the configured interval delay between message batches
        const lastSentAt = new Date(ctaMessages[0].created_at).getTime();
        const minutesSinceLast = (Date.now() - lastSentAt) / 60000;

        if (minutesSinceLast >= intervalMinutes) {
          shouldBroadcast = true;
        }
      }

      if (shouldBroadcast) {
        // Fetch Knowledge and Resources for this webinar
        const knowledge = await getActiveKnowledge(webinar.id);
        const resources = await getActiveResources(webinar.id);

        // Determine how many messages to send in this batch without exceeding maxCount
        const messagesToSend = Math.min(batchSize, maxCount - currentCtaCount);
        
        const angles = [
          'Focus on program reveal, main value proposition, and why attendees should act now.',
          'Focus on student success proof, transformations, and tangible results.',
          'Focus on fast-action scarcity, exclusive bonuses, and final opportunity to enroll.'
        ];

        for (let i = 0; i < messagesToSend; i++) {
          const angle = angles[i % angles.length];
          const messageText = await generateAIBroadcastCTA(webinar, settings, knowledge, resources, angle);

          if (messageText) {
            const insert = {
              session_id: session.id,
              sender_name: aiName,
              message: messageText,
              message_type: 'CTA'
            };

            await supabase.from('chat_messages').insert([insert]);
            processedCount += 1;
            
            // Brief pause between batch messages so timestamps are sequential
            if (i < messagesToSend - 1) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
        }
      }
    }

    return { success: true, processed: processedCount };
  } catch (err) {
    console.error('[AI Broadcaster Error]', err);
    return { success: false, error: err };
  }
}

/**
 * Triggers an instant, manual broadcast CTA into the active live session for a webinar.
 */
export async function triggerManualAIBroadcast(webinarId: string, customInstruction?: string) {
  const supabase = createAdminClient();

  // Find active live session
  const { data: session } = await supabase
    .from('webinar_sessions')
    .select('*, webinars(*)')
    .eq('webinar_id', webinarId)
    .eq('status', 'LIVE')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    throw new Error('Webinar is not currently live in an active session.');
  }

  const webinar = session.webinars as any;
  const settings = await getAISettings();
  const knowledge = await getActiveKnowledge(webinar.id);
  const resources = await getActiveResources(webinar.id);
  const aiName = settings.ai_name || 'MOYA Webinar Assistant';

  const messageText = await generateAIBroadcastCTA(
    webinar,
    settings,
    knowledge,
    resources,
    customInstruction || 'Immediate live promotional pitch with urgency and exact payment link.'
  );

  if (!messageText) {
    throw new Error('AI failed to generate broadcast message.');
  }

  const { data: inserted, error } = await supabase
    .from('chat_messages')
    .insert([{
      session_id: session.id,
      sender_name: aiName,
      message: messageText,
      message_type: 'CTA'
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return inserted;
}
