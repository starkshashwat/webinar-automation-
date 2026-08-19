import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  const { data: webinars, error } = await supabase
    .from('webinars')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ webinars });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Validate admin auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      title, 
      slug, 
      description,
      video_url, 
      recording_url,
      recording_title,
      recording_duration,
      scheduled_start, 
      schedule_type,
      daily_start_time,
      course_url, 
      duration_minutes,
      ai_enabled
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const autoSlug = slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 6);
    const videoUrlToUse = video_url || recording_url || null;

    const adminSupabase = createAdminClient();

    // 1. Try full insert with all fields
    const fullPayload: any = { 
      title: title.trim(), 
      slug: autoSlug, 
      description: description?.trim() || null,
      video_url: videoUrlToUse, 
      recording_url: videoUrlToUse,
      recording_title: recording_title || title.trim(),
      recording_duration: recording_duration || duration_minutes || 60,
      scheduled_start: scheduled_start || null, 
      schedule_type: schedule_type || 'one_time',
      daily_start_time: daily_start_time || null,
      duration_minutes: duration_minutes || 60,
      course_url: course_url || null,
      ai_enabled: ai_enabled !== undefined ? ai_enabled : true,
      course_pitch_enabled: body.course_pitch_enabled !== undefined ? body.course_pitch_enabled : false,
      course_pitch_delay_minutes: body.course_pitch_delay_minutes || 45,
      ai_cta_broadcast_max_count: body.ai_cta_broadcast_max_count || 3,
      ai_cta_broadcast_batch_size: body.ai_cta_broadcast_batch_size || 1,
      ai_cta_broadcast_interval_minutes: body.ai_cta_broadcast_interval_minutes || 5,
      ai_cta_broadcast_prompt: body.ai_cta_broadcast_prompt || null,
      status: 'WAITING'
    };

    let { data: webinar, error } = await adminSupabase
      .from('webinars')
      .insert([fullPayload])
      .select()
      .single();

    // 2. Graceful fallback if newer columns don't exist yet in Supabase schema
    if (error && error.message?.includes('schema cache')) {
      console.warn('[Create Webinar] Schema cache mismatch detected. Falling back to core columns:', error.message);

      const corePayload: any = {
        title: title.trim(),
        slug: autoSlug,
        video_url: videoUrlToUse,
        scheduled_start: scheduled_start || null,
        duration_minutes: duration_minutes || 60,
        course_url: course_url || null,
        ai_enabled: ai_enabled !== undefined ? ai_enabled : true,
        status: 'WAITING'
      };

      const fallbackRes = await adminSupabase
        .from('webinars')
        .insert([corePayload])
        .select()
        .single();

      if (fallbackRes.error) {
        return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, webinar: fallbackRes.data });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, webinar });
  } catch (err: any) {
    console.error('[Create Webinar Error]:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
