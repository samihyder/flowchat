ALTER TABLE conversations ADD COLUMN IF NOT EXISTS awaiting_reply_since timestamp with time zone;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS missed_alert_sent_at timestamp with time zone;

ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS missed_chat_minutes integer NOT NULL DEFAULT 5;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS use_business_hours boolean NOT NULL DEFAULT false;
