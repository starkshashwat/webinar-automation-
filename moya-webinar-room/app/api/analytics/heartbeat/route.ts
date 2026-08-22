import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    const { attendance_session_id, current_video_time } = await request.json();

    if (!attendance_session_id) {
      return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    }

    // Try RPC first (Atomic, 1 Query)
    const { data: newWatchTime, error: rpcError } = await supabase
      .rpc('increment_watch_time', { p_id: attendance_session_id });

    if (!rpcError && newWatchTime !== -1) {
      return NextResponse.json({ success: true, watch_time: newWatchTime });
    }

    // Fallback if RPC doesn't exist yet (Old 2-Query Logic)
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
    
    if (elapsedSeconds > 90) {
      elapsedSeconds = 30; // Default to expected interval
    }

    const fallbackWatchTime = (attendance.watch_time_seconds || 0) + elapsedSeconds;

    await supabase
      .from('attendance_sessions')
      .update({
        last_heartbeat_at: now.toISOString(),
        watch_time_seconds: fallbackWatchTime
      })
      .eq('id', attendance_session_id);

    return NextResponse.json({ success: true, watch_time: fallbackWatchTime });
  } catch (err) {
    console.error('[Heartbeat Error]:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
