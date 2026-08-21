import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const adminSupabase = createAdminClient();

  try {
    const body = await request.json();
    const { webinar_id, name, email, phone } = body;

    if (!webinar_id || !name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    const phoneRegex = /^\+?[0-9\-\s()]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Find the most recent session for this webinar
    let { data: session } = await adminSupabase
      .from('webinar_sessions')
      .select('id')
      .eq('webinar_id', webinar_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      const { data: newSession, error: sessionError } = await adminSupabase
        .from('webinar_sessions')
        .insert([{ webinar_id, status: 'LIVE' }])
        .select('id')
        .single();
        
      if (sessionError) {
        console.warn('[Register] Could not create session, proceeding:', sessionError.message);
      } else {
        session = newSession;
      }
    }

    // Try to find existing registration by phone for this webinar (dedup)
    let attendee: any = null;
    const trimmedEmail = email ? email.trim().toLowerCase() : null;
    const trimmedPhone = phone ? phone.trim() : null;

    if (trimmedPhone) {
      const { data: existing } = await adminSupabase
        .from('webinar_registrations')
        .select('*')
        .eq('webinar_id', webinar_id)
        .eq('phone', trimmedPhone)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Found existing registration — reuse it and update name/email if changed
        const updates: any = {};
        if (existing.name !== name.trim()) updates.name = name.trim();
        if (existing.email !== trimmedEmail) updates.email = trimmedEmail;

        if (Object.keys(updates).length > 0) {
          const { data: updated } = await adminSupabase
            .from('webinar_registrations')
            .update(updates)
            .eq('id', existing.id)
            .select()
            .single();
          attendee = updated || existing;
        } else {
          attendee = existing;
        }
      }
    }

    // If no existing registration found, create a new one
    if (!attendee) {
      const { data: regData, error: regError } = await adminSupabase
        .from('webinar_registrations')
        .insert([{ 
          webinar_id: webinar_id,
          name: name.trim(),
          email: trimmedEmail,
          phone: trimmedPhone
        }])
        .select()
        .single();

      if (regError) {
        console.warn('[Register] Failed webinar_registrations, trying legacy attendees table:', regError.message);
        // Fallback to attendees table if webinar_registrations doesn't exist
        if (session?.id) {
          const { data: legacyData, error: legacyError } = await adminSupabase
            .from('attendees')
            .insert([{
              session_id: session.id,
              display_name: name.trim(),
              email: trimmedEmail,
              phone: trimmedPhone
            }])
            .select()
            .single();

          if (legacyError) {
            throw legacyError;
          }
          attendee = legacyData;
        } else {
          throw regError;
        }
      } else {
        attendee = regData;
      }
    }

    const attendeeId = attendee.id;
    const privateChannelId = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(attendeeId + process.env.NEXT_PUBLIC_SUPABASE_URL))
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    const cookieStore = await cookies();
    cookieStore.set('moya_attendee_session', attendeeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return NextResponse.json({ 
      attendee: {
        id: attendee.id,
        display_name: attendee.name || attendee.display_name,
        private_channel_id: privateChannelId,
        ...attendee
      }
    });
  } catch (err: any) {
    console.error('[Register API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 });
  }
}
