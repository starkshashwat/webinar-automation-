import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    let body: any = {};
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const { attendance_session_id, registration_id, session_id } = body;

    const nowIso = new Date().toISOString();
    // Set heartbeat far in the past to immediately mark inactive in database
    const pastIso = new Date(Date.now() - 120000).toISOString();

    if (attendance_session_id) {
      await supabase
        .from('attendance_sessions')
        .update({
          last_heartbeat_at: pastIso,
          updated_at: nowIso
        })
        .eq('id', attendance_session_id);

      // Log the leave event
      await supabase.from('webinar_watch_events').insert([{
        attendance_session_id,
        event_type: 'LEAVE',
        video_position_seconds: 0
      }]);
    } else if (registration_id && session_id) {
      const { data: existing } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('registration_id', registration_id)
        .eq('session_id', session_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('attendance_sessions')
          .update({
            last_heartbeat_at: pastIso,
            updated_at: nowIso
          })
          .eq('id', existing.id);

        await supabase.from('webinar_watch_events').insert([{
          attendance_session_id: existing.id,
          event_type: 'LEAVE',
          video_position_seconds: 0
        }]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Leave Analytics Error]:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
