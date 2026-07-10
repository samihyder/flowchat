-- Ecosystem integrations: LeadMonitor + WhatsApp CRM child apps per FlowChat workspace.

CREATE TABLE IF NOT EXISTS account_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_type varchar(50) NOT NULL
    CHECK (integration_type IN ('leadmonitor', 'whatsapp_crm')),
  external_id text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, integration_type)
);

CREATE INDEX IF NOT EXISTS account_integrations_account_idx
  ON account_integrations (account_id);
