-- AI Webinar Operator MVP Migration
-- 1. Extend webinars table
ALTER TABLE webinars
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS recording_title TEXT,
ADD COLUMN IF NOT EXISTS recording_duration INTEGER,
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'one_time' CHECK (schedule_type IN ('one_time', 'daily')),
ADD COLUMN IF NOT EXISTS daily_start_time TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- 2. AI Global & Provider Settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_name TEXT NOT NULL DEFAULT 'MOYA Webinar Assistant',
  provider TEXT NOT NULL DEFAULT 'google',
  api_key TEXT,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  system_instructions TEXT NOT NULL DEFAULT 'You are the official webinar assistant. Answer attendee questions clearly and concisely. Use only the provided webinar knowledge. Never invent information. Never invent URLs. If you do not know the answer, say that you do not have enough information and ask the attendee to contact the team. Do not make promises about refunds, payments, access, or account issues. Do not reveal private attendee information. Keep responses short because this is a live webinar chat.',
  is_enabled_globally BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default ai_settings row if not present
INSERT INTO ai_settings (id, ai_name, provider, model, system_instructions, is_enabled_globally)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  'MOYA Webinar Assistant',
  'google',
  'gemini-2.5-flash',
  'You are the official webinar assistant. Answer attendee questions clearly and concisely. Use only the provided webinar knowledge. Never invent information. Never invent URLs. If you do not know the answer, say that you do not have enough information and ask the attendee to contact the team. Do not make promises about refunds, payments, access, or account issues. Do not reveal private attendee information. Keep responses short because this is a live webinar chat.',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM ai_settings LIMIT 1);

-- 3. AI Knowledge Base table
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE, -- NULL means global
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AI Approved Resources / URLs table
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

-- 5. AI Interactions Log table
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

-- Realtime publication for webinars and ai_interactions
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE webinars;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_interactions;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Enable Row Level Security
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Drop and re-create policies to ensure idempotency
DROP POLICY IF EXISTS "Admins can manage ai_settings" ON ai_settings;
CREATE POLICY "Admins can manage ai_settings" ON ai_settings USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage ai_knowledge" ON ai_knowledge;
CREATE POLICY "Admins can manage ai_knowledge" ON ai_knowledge USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage ai_resources" ON ai_resources;
CREATE POLICY "Admins can manage ai_resources" ON ai_resources USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage ai_interactions" ON ai_interactions;
CREATE POLICY "Admins can manage ai_interactions" ON ai_interactions USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Public can view webinars & sessions in realtime
DROP POLICY IF EXISTS "Public can view webinars" ON webinars;
CREATE POLICY "Public can view webinars" ON webinars FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view sessions" ON webinar_sessions;
CREATE POLICY "Public can view sessions" ON webinar_sessions FOR SELECT USING (true);
