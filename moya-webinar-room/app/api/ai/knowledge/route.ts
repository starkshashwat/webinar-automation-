export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const webinar_id = searchParams.get('webinar_id');

  const adminSupabase = createAdminClient();
  
  try {
    let query = adminSupabase.from('ai_knowledge').select('*').order('created_at', { ascending: false });

    if (webinar_id) {
      query = query.or(`webinar_id.eq.${webinar_id},webinar_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback check on legacy knowledge_base table
      console.warn('[AI Knowledge GET] ai_knowledge error, trying legacy fallback:', error.message);
      const { data: legacyData } = await adminSupabase.from('knowledge_base').select('*');
      if (legacyData) {
        return NextResponse.json({ 
          knowledge: legacyData.map((k: any) => ({
            id: k.id,
            webinar_id: k.webinar_id,
            title: k.question,
            content: k.answer,
            active: k.enabled !== false,
            created_at: k.created_at
          }))
        });
      }
      return NextResponse.json({ knowledge: [] });
    }

    return NextResponse.json({ knowledge: data || [] });
  } catch (err: any) {
    return NextResponse.json({ knowledge: [] });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, webinar_id, active } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('ai_knowledge')
      .insert([{
        title: title.trim(),
        content: content.trim(),
        webinar_id: webinar_id || null,
        active: active !== undefined ? active : true,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    console.error('[AI Knowledge POST Error]:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, content, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('ai_knowledge')
      .update({
        ...(title && { title: title.trim() }),
        ...(content && { content: content.trim() }),
        ...(active !== undefined && { active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    console.error('[AI Knowledge PUT Error]:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('ai_knowledge').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
