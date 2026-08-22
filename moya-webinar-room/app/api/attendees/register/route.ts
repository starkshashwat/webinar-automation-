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

    // Fetch webinar status
    const { data: w } = await adminSupabase
      .from('webinars')
      .select('status, scheduled_start')
      .eq('id', webinar_id)
      .single();

    const isWebinarLive = (w?.status === 'LIVE' || w?.status === 'live');

    // Find the most recent active session for this webinar (only if currently live)
    let session: any = null;
    if (isWebinarLive) {
      const { data: activeSession } = await adminSupabase
        .from('webinar_sessions')
        .select('id, status')
        .eq('webinar_id', webinar_id)
        .eq('status', 'LIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      session = activeSession;
    }

    // Try to find existing registration by normalized phone or email for this webinar (dedup)
    let attendee: any = null;
    const trimmedEmail = email ? email.trim().toLowerCase() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const cleanPhoneDigits = trimmedPhone ? trimmedPhone.replace(/[^0-9]/g, '').slice(-10) : null;

    // Build OR query safely to avoid null/comma string parsing issues
    const orConditions = [];
    if (trimmedEmail) orConditions.push(`email.eq.${trimmedEmail}`);
    if (trimmedPhone) orConditions.push(`phone.eq.${trimmedPhone}`);
    
    let existingList: any[] | null = null;
    
    if (orConditions.length > 0) {
      const { data } = await adminSupabase
        .from('webinar_registrations')
        .select('id, name, email, phone')
        .eq('webinar_id', webinar_id)
        .or(orConditions.join(','))
        .limit(1);
      existingList = data;
    }

    const existing = existingList && existingList.length > 0 ? existingList[0] : null;

    if (existing) {
      // Found existing registration — reuse it and update name/email/phone if changed
      const updates: any = {};
      if (existing.name !== name.trim()) updates.name = name.trim();
      if (trimmedEmail && existing.email !== trimmedEmail) updates.email = trimmedEmail;
      if (trimmedPhone && existing.phone !== trimmedPhone) updates.phone = trimmedPhone;

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
