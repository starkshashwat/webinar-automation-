import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    const body = await request.json();
    const { registration_id, session_id, webinar_id } = body;

    if (!registration_id || !session_id) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // 1. Collect target session IDs to check
    const targetSessionIds = new Set<string>();
    targetSessionIds.add(session_id);
    if (webinar_id) {
      targetSessionIds.add(webinar_id);
      const { data: sessList } = await supabase
        .from('webinar_sessions')
        .select('id')
        .eq('webinar_id', webinar_id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (sessList) {
        sessList.forEach(s => targetSessionIds.add(s.id));
      }
    }

    // 2. Check if an attendance session already exists for this attendee
    const { data: existing } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('registration_id', registration_id)
      .in('session_id', Array.from(targetSessionIds))
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Update last_heartbeat_at on existing row
      const { data: updated } = await supabase
        .from('attendance_sessions')
        .update({ last_heartbeat_at: nowIso })
        .eq('id', existing.id)
        .select()
        .single();

      return NextResponse.json({ attendance: updated || existing });
    }

    // 2. Otherwise create a new attendance session record
    const { data: attendance, error } = await supabase
      .from('attendance_sessions')
      .insert([{
        registration_id,
        session_id,
        joined_at: nowIso,
        last_heartbeat_at: nowIso
      }])
      .select()
      .single();

    if (error) {
      console.warn('[Analytics Join] Warning:', error.message);
      return NextResponse.json({ success: false });
    }
    
    // Log the event
    await supabase.from('webinar_watch_events').insert([{
      attendance_session_id: attendance.id,
      event_type: 'JOIN'
    }]);

    return NextResponse.json({ attendance });
  } catch (err) {
    console.error('[Analytics Join Error]:', err);
    return NextResponse.json({ error: 'Failed to join analytics' }, { status: 500 });
  }
}
