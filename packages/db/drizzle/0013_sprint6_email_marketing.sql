-- Sprint 6: Email marketing automation

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_status varchar(20) NOT NULL DEFAULT 'subscribed'
  CHECK (marketing_status IN ('subscribed', 'unsubscribed', 'bounced', 'complained'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;

CREATE TABLE IF NOT EXISTS marketing_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  segment_type varchar(20) NOT NULL DEFAULT 'static' CHECK (segment_type IN ('static', 'dynamic')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_segments_account_idx ON marketing_segments (account_id);

CREATE TABLE IF NOT EXISTS marketing_segment_members (
  segment_id uuid NOT NULL REFERENCES marketing_segments(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, contact_id)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  subject varchar(500) NOT NULL,
  html_body text NOT NULL,
  text_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_account_idx ON email_templates (account_id);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES marketing_segments(id) ON DELETE SET NULL,
  subject varchar(500) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  opened_count int NOT NULL DEFAULT 0,
  clicked_count int NOT NULL DEFAULT 0,
  bounced_count int NOT NULL DEFAULT 0,
  complained_count int NOT NULL DEFAULT 0,
  unsubscribed_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_campaigns_account_idx ON email_campaigns (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  email varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'skipped')),
  resend_message_id varchar(255),
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_campaign_idx ON email_campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS email_campaign_recipients_resend_idx ON email_campaign_recipients (resend_message_id);

CREATE TABLE IF NOT EXISTS contact_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE SET NULL,
  event_type varchar(50) NOT NULL,
  subject varchar(500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_email_events_contact_idx ON contact_email_events (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_email_events_campaign_idx ON contact_email_events (campaign_id);

CREATE TABLE IF NOT EXISTS marketing_unsubscribe_tokens (
  token varchar(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
