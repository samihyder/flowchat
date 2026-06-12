-- CRM integrations: API keys + external contact IDs for sync

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_account_external_id_idx
  ON contacts (account_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS account_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  key_hash text NOT NULL,
  key_prefix varchar(24) NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["contacts:read","contacts:write"]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS account_api_keys_account_id_idx ON account_api_keys (account_id);
