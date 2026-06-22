-- Sprint 7: tenant-owned service credentials (BYOK)

CREATE TABLE IF NOT EXISTS account_service_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category varchar(50) NOT NULL
    CHECK (category IN ('email_marketing', 'ai_chat')),
  provider varchar(50) NOT NULL
    CHECK (provider IN ('resend', 'sendgrid', 'mailgun', 'anthropic', 'platform')),
  label varchar(255) NOT NULL,
  secret_ciphertext text NOT NULL,
  secret_iv text NOT NULL,
  secret_tag text NOT NULL,
  secret_prefix varchar(32) NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invalid', 'revoked')),
  is_default boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  last_used_at timestamptz,
  usage_count bigint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_service_credentials_account_idx
  ON account_service_credentials (account_id);
CREATE INDEX IF NOT EXISTS account_service_credentials_category_idx
  ON account_service_credentials (account_id, category);

ALTER TABLE marketing_senders
  ADD COLUMN IF NOT EXISTS credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL;

ALTER TABLE email_campaign_recipients
  ADD COLUMN IF NOT EXISTS provider varchar(50),
  ADD COLUMN IF NOT EXISTS provider_message_id varchar(255);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_provider_msg_idx
  ON email_campaign_recipients (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
