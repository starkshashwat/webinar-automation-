export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { webinar_id, ai_enabled, global } = await request.json();

    const adminSupabase = createAdminClient();

    if (global) {
      const { data: settings, error } = await adminSupabase
        .from('ai_settings')
        .update({
          is_enabled_globally: ai_enabled,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, is_enabled_globally: ai_enabled });
    }

    if (!webinar_id) {
      return NextResponse.json({ error: 'webinar_id is required' }, { status: 400 });
    }

    const { data: webinar, error } = await adminSupabase
      .from('webinars')
      .update({
        ai_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webinar_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ai_enabled: webinar.ai_enabled });
  } catch (err: any) {
    console.error('[AI Toggle Error]:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
