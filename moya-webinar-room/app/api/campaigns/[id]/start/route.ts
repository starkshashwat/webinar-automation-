import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get campaign to calculate next_run_at based on start_delay_seconds
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = Date.now();
  const nextRun = new Date(now + campaign.start_delay_seconds * 1000).toISOString();

  const { error } = await supabase
    .from('campaigns')
    .update({ 
      status: 'RUNNING', 
      started_at: new Date(now).toISOString(),
      next_run_at: nextRun,
      current_message_position: 0 
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
