export type WebinarStatus = 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled' | 'WAITING' | 'LIVE' | 'ENDED';
export type ScheduleType = 'one_time' | 'daily';

export interface Webinar {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  video_url: string | null;
  recording_url?: string | null;
  recording_title?: string | null;
  recording_duration?: number | null;
  scheduled_start: string | null;
  schedule_type?: ScheduleType;
  daily_start_time?: string | null;
  duration_minutes: number;
  status: WebinarStatus;
  course_url: string | null;
  ai_enabled: boolean;
  started_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebinarSession {
  id: string;
  webinar_id: string;
  started_at: string;
  ended_at: string | null;
  status: WebinarStatus;
}

export interface Attendee {
  id: string;
  session_id: string;
  display_name: string;
  email?: string;
  phone?: string;
  joined_at: string;
  last_seen_at: string;
}
