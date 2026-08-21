import { createAdminClient } from '@/lib/supabase/server';
import { defaultWebinarProvider } from '@/lib/webinar/provider';
import { processAIBroadcasts } from '@/lib/scheduler/ai-broadcaster';

export async function checkAndStartScheduledWebinars(): Promise<{
  startedCount: number;
  endedCount: number;
}> {
  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  let startedCount = 0;
  let endedCount = 0;

  // 1. Find webinars that are scheduled/waiting and have passed their scheduled_start
  const { data: pendingWebinars, error: pendingError } = await supabase
    .from('webinars')
    .select('*')
    .in('status', ['WAITING', 'scheduled', 'waiting'])
    .not('scheduled_start', 'is', null)
    .lte('scheduled_start', nowIso);

  if (pendingError) {
    console.error('[Webinar Scheduler] Error fetching pending webinars:', pendingError);
  } else if (pendingWebinars && pendingWebinars.length > 0) {
    for (const webinar of pendingWebinars) {
      const durationMs = ((webinar.recording_duration || webinar.duration_minutes || 60) * 60 * 1000) + ((webinar.duration_seconds || 0) * 1000);
      const startTime = new Date(webinar.scheduled_start).getTime();

      // If one-time and time has completely passed its full duration window, mark directly as ENDED
      if (webinar.schedule_type !== 'daily' && now.getTime() >= startTime + durationMs) {
        console.log(`[Webinar Scheduler] Auto-ending expired overdue webinar: ${webinar.title} (${webinar.id})`);
        await supabase
          .from('webinars')
          .update({
            status: 'ENDED',
            actual_end_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', webinar.id);
        endedCount++;
      } else {
        console.log(`[Webinar Scheduler] Starting scheduled webinar: ${webinar.title} (${webinar.id})`);
        await defaultWebinarProvider.startWebinar(webinar.id);
        startedCount++;
      }
    }
  }

  // 2. Find live webinars that have exceeded their duration and should END
  const { data: liveWebinars, error: liveError } = await supabase
    .from('webinars')
    .select('*, webinar_sessions(*)')
    .in('status', ['LIVE', 'live']);

  if (liveError) {
    console.error('[Webinar Scheduler] Error fetching live webinars:', liveError);
  } else if (liveWebinars && liveWebinars.length > 0) {
    for (const webinar of liveWebinars) {
      const durationMs = ((webinar.recording_duration || webinar.duration_minutes || 60) * 60 * 1000) + ((webinar.duration_seconds || 0) * 1000);
      const startTime = webinar.started_at 
        ? new Date(webinar.started_at).getTime() 
        : webinar.actual_start_at
        ? new Date(webinar.actual_start_at).getTime()
        : webinar.scheduled_start 
        ? new Date(webinar.scheduled_start).getTime()
        : null;

      if (startTime && now.getTime() >= startTime + durationMs) {
        console.log(`[Webinar Scheduler] Auto-ending completed live webinar: ${webinar.title} (${webinar.id})`);
        
        // Mark session as ended
        await supabase
          .from('webinar_sessions')
          .update({
            status: 'ENDED',
            ended_at: nowIso,
            actual_end_at: nowIso,
          })
          .eq('webinar_id', webinar.id)
          .eq('status', 'LIVE');

        // Check if daily recurrence: update scheduled_start to next day at same time
        if (webinar.schedule_type === 'daily') {
          const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          if (webinar.daily_start_time) {
            const [hours, minutes] = webinar.daily_start_time.split(':').map(Number);
            nextDay.setHours(hours || 0, minutes || 0, 0, 0);
          }
          
          await supabase
            .from('webinars')
            .update({
              status: 'WAITING',
              scheduled_start: nextDay.toISOString(),
              started_at: null,
              actual_start_at: null,
              updated_at: nowIso,
            })
            .eq('id', webinar.id);
        } else {
          // Regular one-time webinar
          await supabase
            .from('webinars')
            .update({
              status: 'ENDED',
              actual_end_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', webinar.id);
        }

        endedCount++;
      }
    }
  }

  // 3. Process AI broadcasts for live webinars
  try {
    await processAIBroadcasts();
  } catch (err) {
    console.error('[Webinar Scheduler] Error running AI broadcasts:', err);
  }

  return { startedCount, endedCount };
}
