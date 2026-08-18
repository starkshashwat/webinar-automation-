export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  
  // Validate admin auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const webinar_id = searchParams.get('webinar_id');
  
  if (!webinar_id) {
    return NextResponse.json({ error: 'webinar_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('webinar_id', webinar_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ knowledge_base: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Validate admin auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { webinar_id, question, answer } = await request.json();

    if (!webinar_id || !question || !answer) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([{ webinar_id, question, answer, enabled: true }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
