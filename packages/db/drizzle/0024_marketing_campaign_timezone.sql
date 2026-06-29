-- Campaign schedule timezone + per-recipient local delivery mode (S6M)

ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS schedule_timezone varchar(100) NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS schedule_mode varchar(20) NOT NULL DEFAULT 'recipient_local'
    CHECK (schedule_mode IN ('campaign', 'recipient_local'));
