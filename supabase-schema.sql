-- ==============================================================================
-- MOYA WEBINAR AUTOMATION & AI OPERATOR - COMPLETE SUPABASE SCHEMA
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query -> RUN
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create profiles table for Host / Admin auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create webinars table
CREATE TABLE IF NOT EXISTS webinars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  video_url TEXT,
  recording_url TEXT,
  recording_title TEXT,
  recording_duration INTEGER,
  thumbnail_url TEXT,
  type TEXT DEFAULT 'LIVE',
  host_name TEXT,
  max_attendees INTEGER,
  schedule_type TEXT DEFAULT 'one_time' CHECK (schedule_type IN ('one_time', 'daily')),
  daily_start_time TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  actual_start_at TIMESTAMP WITH TIME ZONE,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'LIVE', 'ENDED')),
  course_url TEXT,
  course_pitch_enabled BOOLEAN DEFAULT FALSE,
  course_pitch_delay_minutes INTEGER DEFAULT 45,
  ai_enabled BOOLEAN DEFAULT TRUE,
  ai_cta_broadcast_prompt TEXT,
  ai_cta_broadcast_interval_minutes INTEGER DEFAULT 5,
  ai_cta_broadcast_max_count INTEGER DEFAULT 3,
  ai_cta_broadcast_batch_size INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create webinar_sessions table
CREATE TABLE IF NOT EXISTS webinar_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  actual_start_at TIMESTAMP WITH TIME ZONE,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'ENDED'))
);

-- 5. Create webinar_registrations table (Attendee registrations)
CREATE TABLE IF NOT EXISTS webinar_registrations (
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

-- 6. Create legacy attendees table (for backwards compatibility)
CREATE TABLE IF NOT EXISTS attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create attendance_sessions table (for live heartbeat and watch analytics)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES webinar_registrations(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_time_seconds INTEGER DEFAULT 0
);

-- 8. Create webinar_watch_events table (Retention analytics)
CREATE TABLE IF NOT EXISTS webinar_watch_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL, -- 'JOIN', 'HEARTBEAT', 'LEAVE'
  video_position_seconds INTEGER DEFAULT 0
);

-- 9. Create webinar_conversions table
CREATE TABLE IF NOT EXISTS webinar_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES webinar_registrations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'CTA_CLICK', 'CHECKOUT_STARTED', 'PURCHASED'
  value NUMERIC DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE NOT NULL,
  registration_id UUID REFERENCES webinar_registrations(id) ON DELETE CASCADE,
  attendee_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('ATTENDEE', 'AI', 'HOST', 'CTA', 'SYSTEM')),
  target_attendee_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Create AI Global Settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_name TEXT NOT NULL DEFAULT 'MOYA Webinar Assistant',
  provider TEXT NOT NULL DEFAULT 'google',
  api_key TEXT,
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  system_instructions TEXT NOT NULL DEFAULT 'You are the official webinar assistant. Answer attendee questions clearly and concisely. Use only the provided webinar knowledge. Never invent information. Never invent URLs. If you do not know the answer, say that you do not have enough information and ask the attendee to contact the team. Do not make promises about refunds, payments, access, or account issues. Do not reveal private attendee information. Keep responses short because this is a live webinar chat.',
  is_enabled_globally BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default ai_settings record
INSERT INTO ai_settings (id, ai_name, provider, model, system_instructions, is_enabled_globally)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  'MOYA Webinar Assistant',
  'google',
  'gemini-2.0-flash',
  'You are the official webinar assistant. Answer attendee questions clearly and concisely. Use only the provided webinar knowledge. Never invent information. Never invent URLs. If you do not know the answer, say that you do not have enough information and ask the attendee to contact the team. Do not make promises about refunds, payments, access, or account issues. Do not reveal private attendee information. Keep responses short because this is a live webinar chat.',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM ai_settings LIMIT 1);

-- 12. Create AI Knowledge Base table
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE, -- NULL means global
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Create AI Resources & Approved Links table
CREATE TABLE IF NOT EXISTS ai_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE, -- NULL means global
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Create AI Interactions Audit Log table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE,
  attendee_id UUID,
  chat_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  attendee_name TEXT,
  attendee_message TEXT,
  intent TEXT,
  response_mode TEXT CHECK (response_mode IN ('public', 'private', 'no_response')),
  response TEXT,
  confidence TEXT CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_webinars_slug ON webinars(slug);
CREATE INDEX IF NOT EXISTS idx_webinars_status ON webinars(status);
CREATE INDEX IF NOT EXISTS idx_sessions_webinar_id ON webinar_sessions(webinar_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_lookup ON attendance_sessions(session_id, registration_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_attendance_id ON webinar_watch_events(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_webinar ON ai_knowledge(webinar_id);
CREATE INDEX IF NOT EXISTS idx_ai_resources_webinar ON ai_resources(webinar_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session ON ai_interactions(session_id);

-- ==============================================================================
-- 16. ENABLE ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Webinars Policy (Public can read; Authenticated Admin can write)
DROP POLICY IF EXISTS "Public can view webinars" ON webinars;
CREATE POLICY "Public can view webinars" ON webinars FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage webinars" ON webinars;
CREATE POLICY "Admins can manage webinars" ON webinars USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Webinar Sessions Policy
DROP POLICY IF EXISTS "Public can view sessions" ON webinar_sessions;
CREATE POLICY "Public can view sessions" ON webinar_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage sessions" ON webinar_sessions;
CREATE POLICY "Admins can manage sessions" ON webinar_sessions USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Registrations & Analytics Policies
DROP POLICY IF EXISTS "Public can access registrations" ON webinar_registrations;
CREATE POLICY "Public can access registrations" ON webinar_registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can access attendance" ON attendance_sessions;
CREATE POLICY "Public can access attendance" ON attendance_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can access watch events" ON webinar_watch_events;
CREATE POLICY "Public can access watch events" ON webinar_watch_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can access conversions" ON webinar_conversions;
CREATE POLICY "Public can access conversions" ON webinar_conversions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view attendees" ON attendees;
CREATE POLICY "Public can view attendees" ON attendees FOR ALL USING (true) WITH CHECK (true);

-- Chat Messages Policy
DROP POLICY IF EXISTS "Public can view chat messages" ON chat_messages;
CREATE POLICY "Public can view chat messages" ON chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can insert attendee messages" ON chat_messages;
CREATE POLICY "Public can insert attendee messages" ON chat_messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage chat messages" ON chat_messages;
CREATE POLICY "Admins can manage chat messages" ON chat_messages USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- AI Settings & Knowledge Policies
DROP POLICY IF EXISTS "Admins can manage ai_settings" ON ai_settings;
CREATE POLICY "Admins can manage ai_settings" ON ai_settings USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage ai_knowledge" ON ai_knowledge;
CREATE POLICY "Admins can manage ai_knowledge" ON ai_knowledge USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage ai_resources" ON ai_resources;
CREATE POLICY "Admins can manage ai_resources" ON ai_resources USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage ai_interactions" ON ai_interactions;
CREATE POLICY "Admins can manage ai_interactions" ON ai_interactions USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ==============================================================================
-- 17. ENABLE SUPABASE REALTIME REPLICATION
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE webinars;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE webinar_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_interactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 18. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
