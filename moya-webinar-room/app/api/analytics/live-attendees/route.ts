import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const webinarId = searchParams.get('webinar_id');

  if (!sessionId && !webinarId) {
    return NextResponse.json({ error: 'Session ID or Webinar ID required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const activeThreshold = new Date(Date.now() - 25000).toISOString();

    const targetSessionIds = new Set<string>();
    if (sessionId) targetSessionIds.add(sessionId);
    if (webinarId) targetSessionIds.add(webinarId);

    if (webinarId) {
      const { data: sessList } = await supabase
        .from('webinar_sessions')
        .select('id')
        .eq('webinar_id', webinarId);
      if (sessList) {
        sessList.forEach(s => targetSessionIds.add(s.id));
      }
    }

    // 1. Fetch attendance sessions for this webinar session(s)
    const { data: attendanceList, error } = await supabase
      .from('attendance_sessions')
      .select('*, webinar_registrations(name, email, phone)')
      .in('session_id', Array.from(targetSessionIds))
      .order('last_heartbeat_at', { ascending: false });

    if (error) {
      return NextResponse.json({ activeCount: 0, totalJoinedCount: 0, attendees: [] });
    }

    const list = attendanceList || [];
    
    // Group uniquely by registration_id to prevent duplicate counting on page refreshes
    const uniqueAttendeesMap = new Map<string, any>();

    for (const item of list) {
      const regId = item.registration_id;
      const reg = item.webinar_registrations as any;
      const isItemActive = item.last_heartbeat_at && new Date(item.last_heartbeat_at) >= new Date(activeThreshold);

      if (!uniqueAttendeesMap.has(regId)) {
        uniqueAttendeesMap.set(regId, {
          id: item.id,
          registrationId: regId,
          name: reg?.name || 'Anonymous Attendee',
          email: reg?.email || '',
          phone: reg?.phone || '',
          joinedAt: item.joined_at,
          lastHeartbeatAt: item.last_heartbeat_at,
          watchTimeSeconds: item.watch_time_seconds || 0,
          isActive: Boolean(isItemActive)
        });
      } else {
        const existing = uniqueAttendeesMap.get(regId);
        // If any session has heartbeat in last 60s, mark as active
        if (isItemActive) existing.isActive = true;
        // Keep earliest joinedAt
        if (new Date(item.joined_at) < new Date(existing.joinedAt)) {
          existing.joinedAt = item.joined_at;
        }
        // Keep latest heartbeat
        if (item.last_heartbeat_at && (!existing.lastHeartbeatAt || new Date(item.last_heartbeat_at) > new Date(existing.lastHeartbeatAt))) {
          existing.lastHeartbeatAt = item.last_heartbeat_at;
        }
        // Take max or sum of watchTimeSeconds
        existing.watchTimeSeconds = Math.max(existing.watchTimeSeconds, item.watch_time_seconds || 0);
      }
    }

    const formattedAttendees = Array.from(uniqueAttendeesMap.values());
    const activeCount = formattedAttendees.filter(a => a.isActive).length;

    return NextResponse.json({
      activeCount,
      totalJoinedCount: formattedAttendees.length,
      attendees: formattedAttendees
    });
  } catch (err: any) {
    console.error('[Live Attendees API Error]:', err);
    return NextResponse.json({ activeCount: 0, totalJoinedCount: 0, attendees: [] });
  }
}
