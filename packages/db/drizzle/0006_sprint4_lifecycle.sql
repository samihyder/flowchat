DO $$ BEGIN
  CREATE TYPE conversation_priority AS ENUM ('urgent', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority conversation_priority NOT NULL DEFAULT 'medium';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS snoozed_until timestamp with time zone;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  color varchar(20) NOT NULL DEFAULT '#6366F1',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(account_id, name)
);

CREATE TABLE IF NOT EXISTS conversation_labels (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);

ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS allowed_domains jsonb DEFAULT '[]'::jsonb;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS business_hours jsonb;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS offline_message text;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS privacy_policy_url text;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS require_consent boolean NOT NULL DEFAULT false;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS round_robin_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inbox_id uuid REFERENCES inboxes(id) ON DELETE CASCADE,
  ip_address varchar(45) NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS blocked_ips_lookup_idx ON blocked_ips (account_id, ip_address);

CREATE TABLE IF NOT EXISTS inbox_round_robin_state (
  inbox_id uuid PRIMARY KEY REFERENCES inboxes(id) ON DELETE CASCADE,
  last_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
