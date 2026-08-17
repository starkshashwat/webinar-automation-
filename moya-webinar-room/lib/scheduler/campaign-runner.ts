import { createAdminClient } from '../supabase/server';
import { type Campaign, type CampaignMessage } from '@/types/campaign';
import { type Webinar } from '@/types/webinar';

export async function processCampaigns() {
  const supabase = createAdminClient();

  // 1. Find all running campaigns where next_run_at <= NOW()
  const now = new Date().toISOString();
  
  const { data: activeCampaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*, webinars(*)')
    .eq('status', 'RUNNING')
    .lte('next_run_at', now);

  if (campaignsError || !activeCampaigns || activeCampaigns.length === 0) {
    return { success: true, processed: 0 };
  }

  let processedCount = 0;

  for (const campaignData of activeCampaigns) {
    const campaign = campaignData as any;
    const webinar = campaign.webinars as Webinar;

    // Check if webinar is still LIVE. If not, stop campaign.
    if (webinar.status !== 'LIVE') {
      await supabase
        .from('campaigns')
        .update({ status: 'STOPPED', stopped_at: new Date().toISOString() })
        .eq('id', campaign.id);
      continue;
    }

    // Find active session for this webinar
    const { data: session } = await supabase
      .from('webinar_sessions')
      .select('id')
      .eq('webinar_id', webinar.id)
      .eq('status', 'LIVE')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) continue;

    // Fetch messages for this campaign
    const { data: messages } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('enabled', true)
      .order('position', { ascending: true });

    if (!messages || messages.length === 0) continue;

    // Determine which message to send
    const position = campaign.current_message_position % messages.length;
    const msgToSend = messages[position] as CampaignMessage;

    // Replace {{COURSE_URL}}
    const courseUrl = webinar.course_url || 'https://moya.com';
    const finalMessageText = msgToSend.message.replace(/{{COURSE_URL}}/g, courseUrl);

    // Send the message
    await supabase.from('chat_messages').insert([{
      session_id: session.id,
      sender_name: 'MOYA',
      message: finalMessageText,
      message_type: 'CTA'
    }]);

    // Calculate next run time
    const nextRun = new Date(Date.now() + campaign.interval_seconds * 1000).toISOString();

    // Update campaign state
    await supabase.from('campaigns').update({
      current_message_position: campaign.current_message_position + 1,
      next_run_at: nextRun,
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id);

    processedCount++;
  }

  return { success: true, processed: processedCount };
}
