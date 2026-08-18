ALTER TABLE webinars
ADD COLUMN IF NOT EXISTS ai_cta_broadcast_batch_size INTEGER DEFAULT 1;
