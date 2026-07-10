-- Per-campaign send-rate throttling and bounce/unsubscribe handling toggles

ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS send_rate_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS send_rate_per_hour int NOT NULL DEFAULT 500;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS auto_mark_bounced boolean NOT NULL DEFAULT true;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS process_unsubscribes boolean NOT NULL DEFAULT true;
