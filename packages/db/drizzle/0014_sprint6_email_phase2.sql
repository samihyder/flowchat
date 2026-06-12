-- Sprint 6 phase 2: multiple senders, workflows, double opt-in

CREATE TABLE IF NOT EXISTS marketing_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label varchar(255) NOT NULL,
  from_name varchar(255) NOT NULL,
  from_email varchar(255) NOT NULL,
  reply_to varchar(255),
  physical_address text,
  is_default boolean NOT NULL DEFAULT false,
  domain_status varchar(20) NOT NULL DEFAULT 'unknown'
    CHECK (domain_status IN ('unknown', 'pending', 'verified', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_senders_account_idx ON marketing_senders (account_id);

ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES marketing_senders(id) ON DELETE SET NULL;

-- Expand subscription states for double opt-in
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_marketing_status_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_marketing_status_check
  CHECK (marketing_status IN ('subscribed', 'unsubscribed', 'bounced', 'complained', 'pending'));

CREATE TABLE IF NOT EXISTS marketing_confirm_tokens (
  token varchar(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS marketing_confirm_tokens_contact_idx ON marketing_confirm_tokens (contact_id);

CREATE TABLE IF NOT EXISTS marketing_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  trigger_type varchar(50) NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'contact_created', 'label_added', 'conversation_resolved')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sender_id uuid REFERENCES marketing_senders(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  allow_reentry boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_workflows_account_idx ON marketing_workflows (account_id);

CREATE TABLE IF NOT EXISTS marketing_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES marketing_workflows(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  step_type varchar(50) NOT NULL
    CHECK (step_type IN ('send_email', 'wait', 'add_label', 'exit')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS marketing_workflow_steps_workflow_idx ON marketing_workflow_steps (workflow_id, step_order);

CREATE TABLE IF NOT EXISTS marketing_workflow_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES marketing_workflows(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step_order int NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  next_run_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS marketing_workflow_enrollments_due_idx
  ON marketing_workflow_enrollments (next_run_at) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS marketing_workflow_enrollments_unique_idx
  ON marketing_workflow_enrollments (workflow_id, contact_id) WHERE status = 'active';
