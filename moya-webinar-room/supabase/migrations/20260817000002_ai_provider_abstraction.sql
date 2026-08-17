-- Add api_base_url to ai_settings
ALTER TABLE ai_settings
ADD COLUMN IF NOT EXISTS api_base_url TEXT;
