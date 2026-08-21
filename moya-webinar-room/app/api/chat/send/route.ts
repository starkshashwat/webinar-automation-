import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { processChatMessage } from '@/lib/ai/operator';

const rateLimit = new Map<string, { count: number, timestamp: number }>();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  try {
    const body = await request.json();
    const { session_id, message, sender_name, message_type, target_attendee_id, attendee_id: rawAttendeeId } = body;

    if (!session_id || !message || !sender_name) {
      return NextResponse.json({ error: 'Missing required fields (session_id, message, sender_name)' }, { status: 400 });
    }

    const rateKey = `${session_id}:${sender_name}`;
    const now = Date.now();
    const limit = rateLimit.get(rateKey) || { count: 0, timestamp: now };
    
    if (now - limit.timestamp > 60000) {
      limit.count = 0;
      limit.timestamp = now;
    }
    
    if (limit.count >= 30) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
    }
    
    limit.count++;
    rateLimit.set(rateKey, limit);

    // Default to ATTENDEE unless HOST is specified
    let finalMessageType = message_type === 'HOST' ? 'HOST' : 'ATTENDEE';

    // 1. Ensure valid webinar session
    let validSessionId = session_id;
    let targetWebinarId: string | null = null;

    const { data: existingSession } = await adminSupabase
      .from('webinar_sessions')
      .select('id, webinar_id')
      .eq('id', session_id)
      .maybeSingle();

    if (existingSession) {
      targetWebinarId = existingSession.webinar_id;
    } else {
      // Check if session_id passed was actually a webinar_id
      const { data: webinar } = await adminSupabase
        .from('webinars')
        .select('id')
        .eq('id', session_id)
        .maybeSingle();

      targetWebinarId = webinar?.id || session_id;

      // Find any session for this webinar or create a new one
      const { data: foundSession } = await adminSupabase
        .from('webinar_sessions')
        .select('id')
        .eq('webinar_id', targetWebinarId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (foundSession) {
        validSessionId = foundSession.id;
      } else {
        const { data: newSession, error: createSessionErr } = await adminSupabase
          .from('webinar_sessions')
          .insert([{ webinar_id: targetWebinarId, status: 'LIVE' }])
          .select('id')
          .single();

        if (createSessionErr) {
          console.error('[Chat API] Failed to create session:', createSessionErr);
        } else if (newSession) {
          validSessionId = newSession.id;
        }
      }
    }

    // 2. Resolve Target Attendee ID for Private Replies
    let validTargetId: string | null = null;
    if (target_attendee_id && typeof target_attendee_id === 'string' && target_attendee_id.trim()) {
      const cleanTarget = target_attendee_id.trim();
      if (UUID_REGEX.test(cleanTarget)) {
        validTargetId = cleanTarget;
      } else if (targetWebinarId) {
        // Look up attendee by name in webinar_registrations
        const { data: matchedReg } = await adminSupabase
          .from('webinar_registrations')
          .select('id')
          .eq('webinar_id', targetWebinarId)
          .ilike('name', cleanTarget)
          .limit(1)
          .maybeSingle();

        if (matchedReg) {
          validTargetId = matchedReg.id;
        }
      }
    }

    // 3. Resolve Sender Attendee / Registration ID
    let finalAttendeeId: string | null = null;
    
    // Check Host Auth
    const { data: { user } } = await supabase.auth.getUser();
    const isHost = !!user;
    
    if (isHost && finalMessageType === 'HOST') {
       // Host can send messages
    } else {
       // Attendee must use cookie for identity security
       const cookieStore = await cookies();
       const cookieAttendeeId = cookieStore.get('moya_attendee_session')?.value;
       
       if (cookieAttendeeId && typeof cookieAttendeeId === 'string' && UUID_REGEX.test(cookieAttendeeId)) {
         finalAttendeeId = cookieAttendeeId;
       }
       
       // Fallback if no cookie (for strict backwards compatibility if needed, but per plan we prefer derived)
       // Let's rely entirely on cookie if it's there.
       if (!finalAttendeeId && rawAttendeeId && typeof rawAttendeeId === 'string' && UUID_REGEX.test(rawAttendeeId)) {
         finalAttendeeId = rawAttendeeId; // Only if absolutely no cookie (e.g., legacy session)
       }
    }

    if (finalMessageType === 'ATTENDEE' && !finalAttendeeId && targetWebinarId) {
      const { data: attendees } = await adminSupabase
        .from('webinar_registrations')
        .select('id')
        .eq('webinar_id', targetWebinarId)
        .ilike('name', sender_name.trim())
        .limit(1);

      if (attendees && attendees.length > 0) {
        finalAttendeeId = attendees[0].id;
      }
    }

    // 4. Insert Message
    const { data: chatMessage, error } = await adminSupabase
      .from('chat_messages')
      .insert([
        {
          session_id: validSessionId,
          registration_id: finalAttendeeId,
          attendee_id: finalAttendeeId,
          sender_name: sender_name.trim(),
          message: message.trim(),
          message_type: finalMessageType,
          target_attendee_id: validTargetId
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[Chat API] Error inserting chat:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Process AI in the background if attendee message
    if (finalMessageType === 'ATTENDEE') {
      processChatMessage({
        sessionId: validSessionId,
        attendeeId: finalAttendeeId,
        messageId: chatMessage.id,
        message: message.trim(),
        senderName: sender_name.trim(),
      }).catch((err) => {
        console.error('[Chat API] Background AI processing failed:', err);
      });
    }

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (err: any) {
    console.error('[Chat API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 });
  }
}
