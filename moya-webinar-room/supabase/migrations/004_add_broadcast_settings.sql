ALTER TABLE webinars
ADD COLUMN IF NOT EXISTS ai_cta_broadcast_max_count INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS ai_cta_broadcast_interval_minutes INTEGER DEFAULT 5;
