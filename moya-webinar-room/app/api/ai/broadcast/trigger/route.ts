import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerManualAIBroadcast } from '@/lib/scheduler/ai-broadcaster';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Validate admin auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { webinar_id, instruction } = await request.json();

    if (!webinar_id) {
      return NextResponse.json({ error: 'webinar_id is required' }, { status: 400 });
    }

    const message = await triggerManualAIBroadcast(webinar_id, instruction);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('[Manual AI Broadcast Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to trigger broadcast' }, { status: 500 });
  }
}
