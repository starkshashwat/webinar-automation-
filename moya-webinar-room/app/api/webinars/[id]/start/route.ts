import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { defaultWebinarProvider } from '@/lib/webinar/provider';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await defaultWebinarProvider.startWebinar(id);
    return NextResponse.json({ success: true, status: 'LIVE' });
  } catch (err: any) {
    console.error('[Start Webinar Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to start webinar' }, { status: 500 });
  }
}
