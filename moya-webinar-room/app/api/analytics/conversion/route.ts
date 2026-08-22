import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  const cookieStore = await cookies();

  try {
    let body: any = {};
    const text = await request.text().catch(() => '');
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    let registrationId = body.registration_id;

    if (!registrationId) {
      registrationId = cookieStore.get('moya_attendee_session')?.value;
    }

    if (!registrationId && body.webinar_id) {
      // Fallback: lookup registration by webinar_id if single attendee
      const { data: latestReg } = await supabase
        .from('webinar_registrations')
        .select('id')
        .eq('webinar_id', body.webinar_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestReg) {
        registrationId = latestReg.id;
      }
    }

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registration id' }, { status: 400 });
    }

    const eventType = body.event_type || 'CTA_CLICK';
    const value = body.value || 0;

    const { error } = await supabase
      .from('webinar_conversions')
      .insert([{
        registration_id: registrationId,
        event_type: eventType,
        value: value,
        timestamp: body.timestamp || new Date().toISOString()
      }]);

    if (error) {
      console.warn('[Conversion Track Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Conversion API Error]:', err);
    return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 });
  }
}
