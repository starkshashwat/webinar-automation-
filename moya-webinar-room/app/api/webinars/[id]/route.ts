import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: webinar, error } = await supabase
    .from('webinars')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !webinar) {
    return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
  }

  return NextResponse.json({ webinar });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  // Validate admin auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

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
      ai_enabled,
      status
    } = body;

    const videoUrlToUse = video_url !== undefined ? video_url : recording_url;
    const adminSupabase = createAdminClient();

    // Check if scheduling into the future
    let newStatus = status;
    let resetStartedAt = false;

    if (scheduled_start) {
      const scheduledTime = new Date(scheduled_start).getTime();
      if (scheduledTime > Date.now()) {
        newStatus = 'WAITING';
        resetStartedAt = true;
      }
    }

    // 1. Try full update with all fields
    const fullPayload: any = { 
      ...(title && { title: title.trim() }),
      ...(slug && { slug: slug.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(videoUrlToUse !== undefined && { video_url: videoUrlToUse, recording_url: videoUrlToUse }),
      ...(recording_title !== undefined && { recording_title }),
      ...(recording_duration !== undefined && { recording_duration }),
      ...(scheduled_start !== undefined && { scheduled_start }),
      ...(schedule_type !== undefined && { schedule_type }),
      ...(daily_start_time !== undefined && { daily_start_time }),
      ...(duration_minutes !== undefined && { duration_minutes }),
      ...(body.duration_seconds !== undefined && { duration_seconds: body.duration_seconds }),
      ...(course_url !== undefined && { course_url }),
      ...(ai_enabled !== undefined && { ai_enabled }),
      ...(body.course_pitch_enabled !== undefined && { course_pitch_enabled: body.course_pitch_enabled }),
      ...(body.course_pitch_delay_minutes !== undefined && { course_pitch_delay_minutes: body.course_pitch_delay_minutes }),
      ...(body.course_pitch_delay_seconds !== undefined && { course_pitch_delay_seconds: body.course_pitch_delay_seconds }),
      ...(body.ai_cta_broadcast_max_count !== undefined && { ai_cta_broadcast_max_count: body.ai_cta_broadcast_max_count }),
      ...(body.ai_cta_broadcast_batch_size !== undefined && { ai_cta_broadcast_batch_size: body.ai_cta_broadcast_batch_size }),
      ...(body.ai_cta_broadcast_interval_minutes !== undefined && { ai_cta_broadcast_interval_minutes: body.ai_cta_broadcast_interval_minutes }),
      ...(body.ai_cta_broadcast_prompt !== undefined && { ai_cta_broadcast_prompt: body.ai_cta_broadcast_prompt }),
      ...(body.ai_cta_broadcast_type !== undefined && { ai_cta_broadcast_type: body.ai_cta_broadcast_type }),
      ...(body.ai_cta_broadcast_frequency !== undefined && { ai_cta_broadcast_frequency: body.ai_cta_broadcast_frequency }),
      ...(body.ai_cta_broadcast_end_condition !== undefined && { ai_cta_broadcast_end_condition: body.ai_cta_broadcast_end_condition }),
      ...(body.ai_cta_broadcast_image_url !== undefined && { ai_cta_broadcast_image_url: body.ai_cta_broadcast_image_url }),
      ...(body.ai_cta_broadcast_images !== undefined && { ai_cta_broadcast_images: body.ai_cta_broadcast_images }),
      ...(body.ai_cta_banner_duration_seconds !== undefined && { ai_cta_banner_duration_seconds: body.ai_cta_banner_duration_seconds }),
      ...(body.ai_cta_banner_delay_seconds !== undefined && { ai_cta_banner_delay_seconds: body.ai_cta_banner_delay_seconds }),
      ...(body.ai_cta_banner_interval_minutes !== undefined && { ai_cta_banner_interval_minutes: body.ai_cta_banner_interval_minutes }),
      ...(newStatus !== undefined && { status: newStatus }),
      ...(resetStartedAt && { started_at: null, actual_start_at: null, actual_end_at: null }),
      updated_at: new Date().toISOString()
    };

    let { data: webinar, error } = await adminSupabase
      .from('webinars')
      .update(fullPayload)
      .eq('id', id)
      .select()
      .single();

    // 2. Graceful fallback if newer columns don't exist yet in Supabase schema
    if (error && error.message?.includes('schema cache')) {
      console.warn('[Update Webinar] Schema cache mismatch detected. Falling back to core columns:', error.message);
      
      const corePayload: any = {
        ...(title && { title: title.trim() }),
        ...(slug && { slug: slug.trim() }),
        ...(videoUrlToUse !== undefined && { video_url: videoUrlToUse }),
        ...(scheduled_start !== undefined && { scheduled_start }),
        ...(duration_minutes !== undefined && { duration_minutes }),
        ...(course_url !== undefined && { course_url }),
        ...(ai_enabled !== undefined && { ai_enabled }),
        ...(newStatus !== undefined && { status: newStatus }),
        ...(resetStartedAt && { started_at: null, actual_start_at: null, actual_end_at: null }),
        updated_at: new Date().toISOString()
      };

      const fallbackRes = await adminSupabase
        .from('webinars')
        .update(corePayload)
        .eq('id', id)
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
    console.error('[Update Webinar Error]:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('webinars').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
