-- Enable pgcrypto for UUIDs if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. profiles (For admin auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. webinars
CREATE TABLE webinars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  video_url TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'LIVE', 'ENDED')),
  course_url TEXT,
  ai_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. webinar_sessions
CREATE TABLE webinar_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'ENDED'))
);

-- 4. attendees
CREATE TABLE attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. chat_messages
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES webinar_sessions(id) ON DELETE CASCADE NOT NULL,
  attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('ATTENDEE', 'AI', 'HOST', 'CTA', 'SYSTEM')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. campaigns
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_delay_seconds INTEGER NOT NULL DEFAULT 600,
  interval_seconds INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'STOPPED' CHECK (status IN ('RUNNING', 'PAUSED', 'STOPPED')),
  current_message_position INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  stopped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. campaign_messages
CREATE TABLE campaign_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  position INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. knowledge_base
CREATE TABLE knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Admins can read their own, service role can do everything.
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Webinars: Public can read all webinars (needed to fetch by slug). Admins can do all.
CREATE POLICY "Public can view webinars" ON webinars
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage webinars" ON webinars
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Webinar Sessions: Public can read all sessions. Admins can do all.
CREATE POLICY "Public can view sessions" ON webinar_sessions
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage sessions" ON webinar_sessions
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Attendees: Public can read all attendees (optional but helpful). Public can insert. Admins can do all.
CREATE POLICY "Public can view attendees" ON attendees
  FOR SELECT USING (true);
CREATE POLICY "Public can insert attendees" ON attendees
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update attendees (last seen)" ON attendees
  FOR UPDATE USING (true);
CREATE POLICY "Admins can manage attendees" ON attendees
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Chat Messages:
-- - Public can READ messages for ANY active or past session (needed to see history when joining).
-- - Public can INSERT messages ONLY IF type is 'ATTENDEE'.
CREATE POLICY "Public can view chat messages" ON chat_messages
  FOR SELECT USING (true);
CREATE POLICY "Public can insert attendee messages" ON chat_messages
  FOR INSERT WITH CHECK (message_type = 'ATTENDEE');
CREATE POLICY "Admins can manage chat messages" ON chat_messages
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Campaigns: Admins only.
CREATE POLICY "Admins can manage campaigns" ON campaigns
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Campaign Messages: Admins only.
CREATE POLICY "Admins can manage campaign messages" ON campaign_messages
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 8. Knowledge Base: Admins only.
CREATE POLICY "Admins can manage knowledge base" ON knowledge_base
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ==========================================
-- REALTIME & GRANTS
-- ==========================================
-- Ensure realtime is enabled on chat_messages and webinar_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE webinar_sessions;

-- Grant permissions to public roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

