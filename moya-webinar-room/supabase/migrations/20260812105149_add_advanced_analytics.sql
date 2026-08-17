-- Alter webinars table to add new configuration and status tracking fields
ALTER TABLE webinars
ADD COLUMN description TEXT,
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN type TEXT DEFAULT 'LIVE',
ADD COLUMN host_name TEXT,
ADD COLUMN max_attendees INTEGER,
ADD COLUMN actual_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN actual_end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN scheduled_end_at TIMESTAMP WITH TIME ZONE;

-- Add actual timestamps to webinar_sessions as well (just in case)
ALTER TABLE webinar_sessions
ADD COLUMN actual_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN actual_end_at TIMESTAMP WITH TIME ZONE;

-- Create webinar_registrations table (replaces the top-level identity part of attendees)
CREATE TABLE webinar_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- We need attendance_sessions to track each join/leave per registration
CREATE TABLE attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES webinar_registrations(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_time_seconds INTEGER DEFAULT 0
);

-- Create webinar_watch_events to power the retention funnel
CREATE TABLE webinar_watch_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL, -- 'JOIN', 'HEARTBEAT', 'LEAVE'
  video_position_seconds INTEGER DEFAULT 0
);

-- Create webinar_conversions table
CREATE TABLE webinar_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES webinar_registrations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'CTA_CLICK', 'CHECKOUT_STARTED', 'PURCHASED'
  value NUMERIC DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now, link existing chat_messages to registration_id instead of attendee_id,
-- or just add registration_id to chat_messages.
ALTER TABLE chat_messages
ADD COLUMN registration_id UUID REFERENCES webinar_registrations(id) ON DELETE CASCADE;

-- Enable RLS (allow public access for V1 MVP, or specific policies as needed)
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert and view webinar_registrations" ON webinar_registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert and view attendance_sessions" ON attendance_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert and view webinar_watch_events" ON webinar_watch_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert and view webinar_conversions" ON webinar_conversions FOR ALL USING (true) WITH CHECK (true);
