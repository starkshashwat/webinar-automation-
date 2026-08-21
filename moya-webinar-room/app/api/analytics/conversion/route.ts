import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  const cookieStore = await cookies();

  try {
    const body = await request.json().catch(() => ({}));
    let registrationId = body.registration_id;

    if (!registrationId) {
      registrationId = cookieStore.get('moya_attendee_session')?.value;
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
        value: value
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
