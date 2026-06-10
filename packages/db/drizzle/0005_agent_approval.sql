DO $$ BEGIN
  CREATE TYPE account_user_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE account_users ADD COLUMN IF NOT EXISTS status account_user_status NOT NULL DEFAULT 'active';

UPDATE account_users SET status = 'active' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS agent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role agent_role NOT NULL DEFAULT 'agent',
  token varchar(64) NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS agent_invites_token_idx ON agent_invites (token);
CREATE INDEX IF NOT EXISTS agent_invites_account_email_idx ON agent_invites (account_id, email);
