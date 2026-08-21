import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim().toLowerCase();
  const phone = searchParams.get('phone')?.trim();

  if (!email && !phone) {
    return NextResponse.json({ error: 'Email or phone required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Find all registrations matching email or phone
    let query = supabase.from('webinar_registrations').select('*, webinars(id, title, slug, duration_minutes)');
    
    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: registrations, error: regError } = await query;

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json({ 
        attendee: { email, phone, name: 'Attendee' },
        totalWebinars: 0,
        totalWatchTimeSeconds: 0,
        timeline: [] 
      });
    }

    const regIds = registrations.map((r) => r.id);

    // 2. Fetch all attendance sessions for these registrations
    const { data: attendanceSessions } = await supabase
      .from('attendance_sessions')
      .select('*, webinar_sessions(id, started_at, status)')
      .in('registration_id', regIds)
      .order('joined_at', { ascending: false });

    // 3. Fetch all conversions / CTA clicks
    const { data: conversions } = await supabase
      .from('webinar_conversions')
      .select('*')
      .in('registration_id', regIds);

    const allSessions = attendanceSessions || [];
    const allConversions = conversions || [];

    // Build timeline grouped by webinar and session
    const timeline = registrations.map((reg) => {
      const webinar = reg.webinars as any;
      const sessions = allSessions.filter((s) => s.registration_id === reg.id);
      const regConversions = allConversions.filter((c) => c.registration_id === reg.id);

      const totalWatchTime = sessions.reduce((acc, s) => acc + (s.watch_time_seconds || 0), 0);
      const firstJoined = sessions.length > 0 
        ? sessions.reduce((min, s) => new Date(s.joined_at) < new Date(min) ? s.joined_at : min, sessions[0].joined_at)
        : reg.created_at;

      return {
        registrationId: reg.id,
        webinarId: webinar?.id || reg.webinar_id,
        webinarTitle: webinar?.title || 'Webinar',
        webinarSlug: webinar?.slug || '',
        registeredAt: reg.created_at,
        joinedAt: firstJoined,
        hasAttended: sessions.length > 0,
        watchTimeSeconds: totalWatchTime,
        expectedDurationMinutes: webinar?.duration_minutes || 60,
        sessionsCount: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          joinedAt: s.joined_at,
          lastHeartbeatAt: s.last_heartbeat_at,
          watchTimeSeconds: s.watch_time_seconds || 0
        })),
        ctaClicks: regConversions.filter(c => c.event_type === 'CTA_CLICK').length,
        conversions: regConversions
      };
    }).sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

    const totalWatchTimeSeconds = timeline.reduce((acc, item) => acc + item.watchTimeSeconds, 0);
    const totalWebinarsJoined = timeline.filter(item => item.hasAttended).length;
    const totalCtaClicks = timeline.reduce((acc, item) => acc + item.ctaClicks, 0);

    const primaryName = registrations.find(r => r.name)?.name || 'Attendee';

    return NextResponse.json({
      attendee: {
        name: primaryName,
        email: email || registrations[0]?.email,
        phone: phone || registrations[0]?.phone
      },
      totalWebinarsRegistered: registrations.length,
      totalWebinarsJoined,
      totalWatchTimeSeconds,
      totalCtaClicks,
      timeline
    });

  } catch (err: any) {
    console.error('[Attendee Timeline API Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
