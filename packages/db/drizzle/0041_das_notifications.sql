CREATE TABLE IF NOT EXISTS das_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  body text,
  entity_type varchar(100),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_notifications_user_idx ON das_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS das_notifications_account_idx ON das_notifications (account_id, created_at DESC);
