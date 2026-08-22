import { createAdminClient } from '../supabase/server';
import { getAISettings, generateAIBroadcastCTA, getActiveKnowledge, getActiveResources } from '../ai/responder';

// In-memory set to prevent concurrent pre-generation runs for the same session
const generatingSessions = new Set<string>();

export async function processAIBroadcasts() {
  const supabase = createAdminClient();

  try {
    // 1. Fetch all pending broadcast queue items due now or in the past
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: pendingBroadcasts, error: fetchError } = await supabase
      .from('webinar_broadcast_queue')
      .select('*, webinars(id, title, status, course_url, course_pitch_enabled, course_pitch_delay_minutes, course_pitch_delay_seconds, scheduled_start, started_at, actual_start_at, ai_cta_broadcast_max_count, ai_cta_broadcast_interval_minutes, ai_cta_banner_duration_seconds, ai_cta_banner_interval_minutes, ai_cta_broadcast_end_condition, ai_cta_broadcast_prompt), webinar_sessions(id, status, started_at)')
      .eq('status', 'PENDING')
      .lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true });

    let processedCount = 0;
    
    if (pendingBroadcasts && pendingBroadcasts.length > 0) {
      const settings = await getAISettings();
      const aiName = settings.ai_name || 'MOYA Webinar Assistant';

      // Group by session_id so we process each webinar session in a controlled manner
      const sessionMap = new Map<string, typeof pendingBroadcasts>();
      for (const item of pendingBroadcasts) {
        if (!sessionMap.has(item.session_id)) {
          sessionMap.set(item.session_id, []);
        }
        sessionMap.get(item.session_id)!.push(item);
      }

      for (const [sessionId, items] of sessionMap.entries()) {
        const webinar = items[0]?.webinars as any;
        const session = items[0]?.webinar_sessions as any;

        // STRICT CHECK 1: Webinar AND Session must be currently LIVE
        const isWebinarLive = webinar?.status === 'LIVE' || webinar?.status === 'live';
        const isSessionLive = session?.status === 'LIVE' || session?.status === 'live';
        if (!isWebinarLive || !isSessionLive) {
          // If webinar is NOT live, NEVER send any broadcast!
          continue;
        }

        // STRICT CHECK 2: Is pitch enabled?
        if (webinar?.course_pitch_enabled === false) {
          await supabase
            .from('webinar_broadcast_queue')
            .update({ status: 'CANCELLED', updated_at: nowIso })
            .eq('session_id', sessionId)
            .eq('status', 'PENDING');
          continue;
        }

        // STRICT CHECK 3: Has the exact unlock time been reached?
        const effectiveStart = webinar?.actual_start_at
          ? new Date(webinar.actual_start_at).getTime()
          : webinar?.scheduled_start 
          ? new Date(webinar.scheduled_start).getTime()
          : session?.started_at 
          ? new Date(session.started_at).getTime()
          : webinar?.started_at 
          ? new Date(webinar.started_at).getTime()
          : 0;

        const pitchDelayMinsMs = (webinar?.course_pitch_delay_minutes || 0) * 60000;
        const pitchDelaySecsMs = (webinar?.course_pitch_delay_seconds || 0) * 1000;
        const unlockTime = effectiveStart + pitchDelayMinsMs + pitchDelaySecsMs;

        if (now.getTime() < unlockTime) {
          // Pitch unlock has NOT arrived yet. NEVER send early!
          continue;
        }

        const maxCount = webinar?.ai_cta_broadcast_max_count || 3;
        const endCondition = webinar?.ai_cta_broadcast_end_condition || 'MAX_COUNT';
        const chatIntervalMinutes = webinar?.ai_cta_broadcast_interval_minutes || 5;
        const bannerIntervalMinutes = Number(webinar?.ai_cta_banner_interval_minutes) || chatIntervalMinutes;
        const bannerDuration = webinar?.ai_cta_banner_duration_seconds || 30;

        // Process CHAT and BANNER independently
        for (const displayType of ['CHAT', 'BANNER']) {
          const typeItems = items.filter(i => i.display_type === displayType);
          if (typeItems.length === 0) continue;

          // Count how many of this specific type have been sent
          const { data: sentMessages } = await supabase
            .from('chat_messages')
            .select('metadata')
            .eq('session_id', sessionId)
            .eq('message_type', 'CTA');

          const currentSent = (sentMessages || []).filter(msg => {
            const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : (msg.metadata || {});
            return meta.type === displayType || meta.type === 'BOTH';
          }).length;

          // If MAX_COUNT is reached for this type, cancel remaining
          if (endCondition === 'MAX_COUNT' && currentSent >= maxCount) {
            await supabase
              .from('webinar_broadcast_queue')
              .update({ status: 'CANCELLED', updated_at: nowIso })
              .eq('session_id', sessionId)
              .eq('display_type', displayType)
              .eq('status', 'PENDING');
            continue;
          }

          // Identify earliest wave for this type
          const earliestTime = new Date(typeItems[0].scheduled_for).getTime();
          const currentWaveItems = typeItems.filter(
            (item) => Math.abs(new Date(item.scheduled_for).getTime() - earliestTime) <= 5000
          );

          const allowedInThisWave = endCondition === 'MAX_COUNT' 
            ? Math.min(currentWaveItems.length, maxCount - currentSent)
            : currentWaveItems.length;

          const toSend = currentWaveItems.slice(0, allowedInThisWave);

          for (let i = 0; i < toSend.length; i++) {
            const b = toSend[i];

            const { data: claimed, error: claimError } = await supabase
              .from('webinar_broadcast_queue')
              .update({ message: '[PROCESSING_GENERATION]', updated_at: nowIso })
              .eq('id', b.id)
              .eq('status', 'PENDING')
              .eq('message', b.message)
              .select('id')
              .single();

            if (claimError || !claimed) continue;

            let finalMessage = b.message;
            if (finalMessage === '[PENDING_GENERATION]') {
              try {
                const knowledge = await getActiveKnowledge(webinar.id);
                const resources = await getActiveResources(webinar.id);
                const angles = [
                  'Focus on program reveal, main value proposition, and why attendees should act now.',
                  'Focus on student success proof, transformations, and tangible results.',
                  'Focus on fast-action scarcity, exclusive bonuses, and final opportunity to enroll.'
                ];
                const angle = angles[processedCount % angles.length];
                finalMessage = await generateAIBroadcastCTA(webinar, settings, knowledge, resources, angle) || 'Don\'t miss out on this offer!';
              } catch (err) {
                console.error('[AI Broadcaster] On-the-fly generation failed:', err);
                // Reschedule for next tick to try again, or fallback
                await supabase
                  .from('webinar_broadcast_queue')
                  .update({ message: b.message, status: 'PENDING', updated_at: nowIso })
                  .eq('id', b.id);
                continue; // Skip insertion for now
              }
            }

            // Resolve the exact payment/course URL for metadata
            let exactCourseUrl = webinar.course_url?.trim() || '';
            if (!exactCourseUrl && webinar.ai_cta_broadcast_prompt) {
              const urlMatch = (webinar.ai_cta_broadcast_prompt as string).match(/(https?:\/\/[^\s]+)/i);
              if (urlMatch) exactCourseUrl = urlMatch[0].replace(/[),.;]+$/, '');
            }

            const metadata = {
              type: b.display_type || 'CHAT',
              imageUrl: b.image_url || null,
              bannerDuration: bannerDuration,
              courseUrl: exactCourseUrl || null
            };

            await supabase
              .from('chat_messages')
              .insert([{
                session_id: b.session_id,
                sender_name: aiName,
                message: finalMessage,
                message_type: 'CTA',
                metadata: metadata
              }]);

            await supabase
              .from('webinar_broadcast_queue')
              .update({ message: finalMessage, status: 'SENT', updated_at: nowIso })
              .eq('id', b.id);

            processedCount++;
          }

          // Cancel excess in wave
          const excessInWave = currentWaveItems.slice(allowedInThisWave);
          for (const ex of excessInWave) {
            await supabase
              .from('webinar_broadcast_queue')
              .update({ status: 'CANCELLED', updated_at: nowIso })
              .eq('id', ex.id);
          }

          // Anti-spam rescheduling for remaining overdue items of this type
          const remainingPastItems = typeItems.filter(
            (item) => !currentWaveItems.includes(item)
          );

          if (remainingPastItems.length > 0) {
            const intervalMins = displayType === 'BANNER' ? bannerIntervalMinutes : chatIntervalMinutes;
            for (let idx = 0; idx < remainingPastItems.length; idx++) {
              const item = remainingPastItems[idx];
              const nextScheduled = new Date(now.getTime() + (idx + 1) * intervalMins * 60000).toISOString();
              await supabase
                .from('webinar_broadcast_queue')
                .update({ scheduled_for: nextScheduled, updated_at: nowIso })
                .eq('id', item.id);
            }
          }
        }
      }
    }

    // 2. Check for active sessions that need pre-generation
    const { data: activeSessions } = await supabase
      .from('webinar_sessions')
      .select('*, webinars(*)')
      .eq('status', 'LIVE');

    if (activeSessions) {
      for (const session of activeSessions) {
        const webinar = session.webinars as any;
        
        // STRICT 1: Both session AND webinar must be LIVE
        if (!webinar || (webinar.status !== 'LIVE' && webinar.status !== 'live')) {
          continue;
        }
        // STRICT 2: Scheduled start must not be in the future
        if (webinar.scheduled_start && new Date(webinar.scheduled_start).getTime() > Date.now()) {
          continue;
        }
        if (webinar.ai_enabled === false || webinar.course_pitch_enabled === false) {
          continue;
        }

        // If already currently generating in memory, skip
        if (generatingSessions.has(session.id)) {
          continue;
        }
        
        // Check if queue already exists for this session
        const { count } = await supabase
          .from('webinar_broadcast_queue')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        if (count === 0) {
          // Pre-generate with lock
          generatingSessions.add(session.id);
          preGenerateAIBroadcasts(session.id)
            .catch(err => console.error('[AI Pre-gen error]', err))
            .finally(() => generatingSessions.delete(session.id));
        }
      }
    }

    return { success: true, dispatched: processedCount };
  } catch (err) {
    console.error('[AI Broadcaster Error]', err);
    return { success: false, error: err };
  }
}

/**
 * Pre-generates the entire broadcast queue for a given session.
 */
async function preGenerateAIBroadcasts(sessionId: string) {
  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from('webinar_sessions')
    .select('*, webinars(*)')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  const webinar = session.webinars as any;
  if (!webinar) return;

  // STRICT: Webinar and session must both be LIVE
  const isWebinarLive = webinar.status === 'LIVE' || webinar.status === 'live';
  const isSessionLive = session.status === 'LIVE' || session.status === 'live';
  if (!isWebinarLive || !isSessionLive) {
    console.log(`[AI Broadcaster] Skipping pre-generation for session ${sessionId}: Webinar is not LIVE (Webinar: ${webinar.status}, Session: ${session.status})`);
    return;
  }

  // Do not pre-generate if scheduled_start is in future
  if (webinar.scheduled_start && new Date(webinar.scheduled_start).getTime() > Date.now()) {
    console.log(`[AI Broadcaster] Skipping pre-generation for session ${sessionId}: scheduled_start is in the future`);
    return;
  }

  const settings = await getAISettings();
  if (settings.is_enabled_globally === false) return;

  // Double check again in database to prevent race conditions
  const { count: existingCount } = await supabase
    .from('webinar_broadcast_queue')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id);

  if ((existingCount || 0) > 0) {
    console.log(`[AI Broadcaster] Queue already exists for session ${sessionId}, skipping pre-generation.`);
    return;
  }

  const effectiveStart = webinar.actual_start_at
    ? new Date(webinar.actual_start_at).getTime()
    : webinar.scheduled_start 
    ? new Date(webinar.scheduled_start).getTime()
    : session.started_at 
    ? new Date(session.started_at).getTime()
    : webinar.started_at 
    ? new Date(webinar.started_at).getTime()
    : Date.now();

  const pitchDelayMinsMs = (webinar.course_pitch_delay_minutes || 0) * 60000;
  const pitchDelaySecsMs = (webinar.course_pitch_delay_seconds || 0) * 1000;
  const unlockTime = effectiveStart + pitchDelayMinsMs + pitchDelaySecsMs;

  const type = webinar.ai_cta_broadcast_type || 'CHAT';
  const freq = webinar.ai_cta_broadcast_frequency || 'EXACT';
  const endCond = webinar.ai_cta_broadcast_end_condition || 'MAX_COUNT';
  const images = Array.isArray(webinar.ai_cta_broadcast_images) && webinar.ai_cta_broadcast_images.length > 0 
                 ? webinar.ai_cta_broadcast_images 
                 : (webinar.ai_cta_broadcast_image_url ? [webinar.ai_cta_broadcast_image_url] : []);
  const maxCount = webinar.ai_cta_broadcast_max_count || 3;
  const intervalMinutes = webinar.ai_cta_broadcast_interval_minutes || 5;
  let batchSize = Math.max(1, Math.min(webinar.ai_cta_broadcast_batch_size || 1, 5));
  
  if (type === 'BANNER' || type === 'BOTH') {
    batchSize = 1; // Banner should only be 1 message at a time
  }

  // Cap generation at 10 clusters max if endCond is WEBINAR_END
  const maxClusters = endCond === 'WEBINAR_END' ? 10 : Math.ceil(maxCount / batchSize);
  
  const knowledge = await getActiveKnowledge(webinar.id);
  const resources = await getActiveResources(webinar.id);

  const angles = [
    'Focus on program reveal, main value proposition, and why attendees should act now.',
    'Focus on student success proof, transformations, and tangible results.',
    'Focus on fast-action scarcity, exclusive bonuses, and final opportunity to enroll.'
  ];

  const bannerDelayMs = (webinar.ai_cta_banner_delay_seconds || 0) * 1000;
  const bannerIntervalMinutes = Number(webinar.ai_cta_banner_interval_minutes) || Number(webinar.ai_cta_broadcast_interval_minutes) || 5;
  const chatIntervalMinutes = Number(webinar.ai_cta_broadcast_interval_minutes) || 5;

  console.log(`[AI Broadcaster] Pre-generating for session ${sessionId} (Type: ${type}, BannerDelay: ${webinar.ai_cta_banner_delay_seconds || 0}s, ChatInterval: ${chatIntervalMinutes}m, BannerInterval: ${bannerIntervalMinutes}m)`);

  // 1. Generate Chat Broadcasts if type is CHAT or BOTH
  if (type === 'CHAT' || type === 'BOTH') {
    let chatCurrentTime = unlockTime;
    let chatGenCount = 0;
    const chatClusters = endCond === 'WEBINAR_END' ? 12 : Math.ceil(maxCount / batchSize);

    for (let cluster = 0; cluster < chatClusters; cluster++) {
      const scheduledTime = chatCurrentTime;
      
      if (freq === 'RANDOM') {
        const gap = Math.floor(Math.random() * (6 * 60000 - 3 * 60000 + 1)) + 3 * 60000;
        chatCurrentTime = scheduledTime + gap;
      } else {
        chatCurrentTime = scheduledTime + (chatIntervalMinutes * 60000);
      }

      const messagesInThisCluster = (endCond === 'MAX_COUNT') 
        ? Math.min(batchSize, maxCount - chatGenCount) 
        : batchSize;
      
      if (messagesInThisCluster <= 0) break;

      for (let i = 0; i < messagesInThisCluster; i++) {
        const exactMessageTime = new Date(scheduledTime + (i * 2000)).toISOString();
        await supabase.from('webinar_broadcast_queue').insert([{
          session_id: session.id,
          webinar_id: webinar.id,
          message: '[PENDING_GENERATION]',
          display_type: 'CHAT',
          image_url: null,
          scheduled_for: exactMessageTime,
          status: 'PENDING'
        }]);
      }

      chatGenCount += messagesInThisCluster;
      if (endCond === 'MAX_COUNT' && chatGenCount >= maxCount) break;
    }
  }

  // 2. Generate Flash Banner Broadcasts if type is BANNER or BOTH
  if (type === 'BANNER' || type === 'BOTH') {
    let bannerCurrentTime = unlockTime + bannerDelayMs;
    let bannerGenCount = 0;
    const bannerClusters = endCond === 'WEBINAR_END' ? 12 : maxCount;

    for (let cluster = 0; cluster < bannerClusters; cluster++) {
      const scheduledTime = bannerCurrentTime;
      
      if (freq === 'RANDOM') {
        const gap = Math.floor(Math.random() * (6 * 60000 - 3 * 60000 + 1)) + 3 * 60000;
        bannerCurrentTime = scheduledTime + gap;
      } else {
        bannerCurrentTime = scheduledTime + (bannerIntervalMinutes * 60000);
      }

      const imageUrl = images.length > 0 ? images[bannerGenCount % images.length] : null;
      const exactBannerTime = new Date(scheduledTime).toISOString();
      
      await supabase.from('webinar_broadcast_queue').insert([{
        session_id: session.id,
        webinar_id: webinar.id,
        message: '[PENDING_GENERATION]',
        display_type: 'BANNER',
        image_url: imageUrl,
        scheduled_for: exactBannerTime,
        status: 'PENDING'
      }]);

      bannerGenCount++;
      if (endCond === 'MAX_COUNT' && bannerGenCount >= maxCount) break;
    }
  }
  
  console.log(`[AI Broadcaster] Pre-generation complete for session ${sessionId}. Queue populated without API delays.`);
}

export async function triggerManualAIBroadcast(webinarId: string, customInstruction?: string) {
  const supabase = createAdminClient();

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
  
  const type = webinar.ai_cta_broadcast_type || 'CHAT';
  const images = Array.isArray(webinar.ai_cta_broadcast_images) && webinar.ai_cta_broadcast_images.length > 0 
                 ? webinar.ai_cta_broadcast_images 
                 : (webinar.ai_cta_broadcast_image_url ? [webinar.ai_cta_broadcast_image_url] : []);
  const imageUrl = images.length > 0 ? images[0] : null;

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
      message_type: 'CTA',
      metadata: {
        type: type,
        imageUrl: imageUrl,
        bannerDuration: webinar.ai_cta_banner_duration_seconds || 30,
        courseUrl: webinar.course_url?.trim() || null
      }
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return inserted;
}
