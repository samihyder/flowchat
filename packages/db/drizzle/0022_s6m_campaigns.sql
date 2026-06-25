-- S6M: Campaign-centric marketing wizard (parallel to legacy email_campaigns)

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Campaign',
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  launched_by uuid REFERENCES users(id) ON DELETE SET NULL,
  launched_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  test_sent_at timestamptz,
  test_sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
  test_sent_to text,
  from_name text,
  from_email text,
  reply_to text,
  signature_html text,
  use_workspace_signature boolean NOT NULL DEFAULT true,
  meeting_link text,
  portfolio_link text,
  credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS marketing_campaigns_account_status_idx
  ON marketing_campaigns (account_id, status);

CREATE TABLE IF NOT EXISTS marketing_campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  step_order smallint NOT NULL,
  send_at timestamptz,
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  plain_body text,
  merge_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  save_as_template boolean NOT NULL DEFAULT false,
  template_name text,
  snapshot_at timestamptz,
  source_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, step_order)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_steps_campaign_idx
  ON marketing_campaign_steps (campaign_id, step_order);

CREATE TABLE IF NOT EXISTS marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  stopped_reason varchar(20) CHECK (
    stopped_reason IS NULL OR stopped_reason IN ('bounce', 'unsubscribe', 'reply', 'complaint')
  ),
  stopped_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_recipients_campaign_idx
  ON marketing_campaign_recipients (campaign_id);

CREATE INDEX IF NOT EXISTS marketing_campaign_recipients_stopped_idx
  ON marketing_campaign_recipients (campaign_id, stopped_reason);

CREATE TABLE IF NOT EXISTS marketing_campaign_recipient_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  campaign_step_id uuid NOT NULL REFERENCES marketing_campaign_steps(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES marketing_campaign_recipients(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'failed',
      'stopped_bounce', 'stopped_unsubscribe', 'stopped_reply', 'stopped_complaint', 'skipped'
    )),
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  retry_count smallint NOT NULL DEFAULT 0,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, campaign_step_id)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_recipient_steps_due_idx
  ON marketing_campaign_recipient_steps (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS marketing_campaign_recipient_steps_provider_msg_idx
  ON marketing_campaign_recipient_steps (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_campaign_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES marketing_campaign_recipients(id) ON DELETE SET NULL,
  step_id uuid REFERENCES marketing_campaign_steps(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_campaign_activity_campaign_idx
  ON marketing_campaign_activity (campaign_id, created_at DESC);
