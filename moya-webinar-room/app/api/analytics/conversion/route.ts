export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const { registration_id, event_type, value } = await request.json();

    if (!registration_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('webinar_conversions')
      .insert([{
        registration_id,
        event_type, // 'CTA_CLICK', 'CHECKOUT_STARTED', 'PURCHASED'
        value: value || 0
      }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 });
  }
}
