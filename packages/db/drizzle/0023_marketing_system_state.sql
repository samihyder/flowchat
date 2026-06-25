-- S6M-9: Cron health + system state for marketing scheduler

CREATE TABLE IF NOT EXISTS marketing_system_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
