-- supabase/migrations/003_add_pitch_settings.sql
ALTER TABLE webinars 
ADD COLUMN IF NOT EXISTS course_pitch_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS course_pitch_delay_minutes INTEGER DEFAULT 45;
