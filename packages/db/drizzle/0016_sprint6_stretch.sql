-- Sprint 6 stretch: send-time optimization, preferences, A/B winner phase

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone varchar(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_preference varchar(20) NOT NULL DEFAULT 'all'
  CHECK (marketing_preference IN ('all', 'reduced', 'none'));

ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS use_send_time_optimization boolean NOT NULL DEFAULT false;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS send_window_start int NOT NULL DEFAULT 9;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS send_window_end int NOT NULL DEFAULT 17;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_phase varchar(20) NOT NULL DEFAULT 'none'
  CHECK (ab_test_phase IN ('none', 'testing', 'winner_sent'));
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_winner_variant varchar(1);
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_winner_after_hours int NOT NULL DEFAULT 24;
