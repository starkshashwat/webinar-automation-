import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    const { attendance_session_id, current_video_time } = await request.json();

    if (!attendance_session_id) {
      return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    }

    const { data: attendance } = await supabase
      .from('attendance_sessions')
      .select('last_heartbeat_at, watch_time_seconds')
      .eq('id', attendance_session_id)
      .single();

    if (!attendance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date();
    const lastHeartbeat = new Date(attendance.last_heartbeat_at);
    let elapsedSeconds = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000);
    
    // Cap at 90 seconds to prevent abuse / huge jumps
    if (elapsedSeconds > 90) {
      elapsedSeconds = 60; // Default to expected interval
    }

    const newWatchTime = (attendance.watch_time_seconds || 0) + elapsedSeconds;

    await supabase
      .from('attendance_sessions')
      .update({
        last_heartbeat_at: now.toISOString(),
        watch_time_seconds: newWatchTime
      })
      .eq('id', attendance_session_id);

    // Removed the 'HEARTBEAT' event insertion to save massive DB overhead.

    return NextResponse.json({ success: true, watch_time: newWatchTime });
  } catch (err) {
    console.error('[Heartbeat Error]:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
