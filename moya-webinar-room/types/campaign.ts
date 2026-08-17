export type CampaignStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';

export interface Campaign {
  id: string;
  webinar_id: string;
  name: string;
  start_delay_seconds: number;
  interval_seconds: number;
  status: CampaignStatus;
  current_message_position: number;
  next_run_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMessage {
  id: string;
  campaign_id: string;
  message: string;
  position: number;
  enabled: boolean;
}
