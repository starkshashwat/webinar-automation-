import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const webinar_id = searchParams.get('webinar_id');

  const { data, error } = await supabase
    .from('campaigns')
    .select('*, campaign_messages(*)')
    .eq('webinar_id', webinar_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ campaign: data || null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { webinar_id, name, start_delay_seconds, interval_seconds, messages } = body;

  // UPSERT logic: simple implementation for V1.
  // Check if campaign exists
  let campaignId;
  const { data: existing } = await supabase.from('campaigns').select('id').eq('webinar_id', webinar_id).single();

  if (existing) {
    campaignId = existing.id;
    await supabase.from('campaigns').update({
      name, start_delay_seconds, interval_seconds
    }).eq('id', campaignId);
    
    // Replace messages
    await supabase.from('campaign_messages').delete().eq('campaign_id', campaignId);
  } else {
    const { data: newCampaign } = await supabase.from('campaigns').insert([{
      webinar_id, name, start_delay_seconds, interval_seconds
    }]).select().single();
    campaignId = newCampaign?.id;
  }

  if (campaignId && messages && messages.length > 0) {
    const msgsToInsert = messages.map((m: any, i: number) => ({
      campaign_id: campaignId,
      message: m.message,
      position: i,
      enabled: true
    }));
    await supabase.from('campaign_messages').insert(msgsToInsert);
  }

  return NextResponse.json({ success: true, campaign_id: campaignId });
}
