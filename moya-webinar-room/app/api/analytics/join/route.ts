export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    const { registration_id, session_id } = await request.json();

    if (!registration_id || !session_id) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }

    const { data: attendance, error } = await supabase
      .from('attendance_sessions')
      .insert([{
        registration_id,
        session_id,
        joined_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString()
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
