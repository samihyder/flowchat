-- Sprint 6 completion: workflows branches, campaign pause/A-B, suppressions, templates archive

ALTER TABLE marketing_workflow_steps DROP CONSTRAINT IF EXISTS marketing_workflow_steps_step_type_check;
ALTER TABLE marketing_workflow_steps ADD CONSTRAINT marketing_workflow_steps_step_type_check
  CHECK (step_type IN ('send_email', 'wait', 'add_label', 'exit', 'branch'));

ALTER TABLE email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_status_check;
ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'paused'));

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE marketing_workflows ADD COLUMN IF NOT EXISTS max_enrollments int;

ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS subject_variant_b varchar(500);
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE email_campaign_recipients ADD COLUMN IF NOT EXISTS ab_variant varchar(1);

ALTER TABLE marketing_workflow_enrollments ADD COLUMN IF NOT EXISTS branch_context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS marketing_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  reason varchar(50) NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, email)
);

CREATE INDEX IF NOT EXISTS marketing_suppressions_account_idx ON marketing_suppressions (account_id);
