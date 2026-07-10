-- Tenant-configurable enrichment flows (drag-and-drop steps + provider field mappings).

CREATE TABLE IF NOT EXISTS enrichment_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  trigger_on varchar(50) NOT NULL DEFAULT 'contact_created'
    CHECK (trigger_on IN ('contact_created', 'manual', 'leadmonitor_sync', 'whatsapp_sync')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrichment_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES enrichment_flows(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 0,
  step_type varchar(50) NOT NULL
    CHECK (step_type IN ('condition', 'provider', 'delay', 'webhook')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrichment_flow_steps_flow_idx
  ON enrichment_flow_steps (flow_id, step_order);

CREATE TABLE IF NOT EXISTS enrichment_provider_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL,
  provider varchar(50) NOT NULL,
  field_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, provider)
);

CREATE INDEX IF NOT EXISTS enrichment_provider_mappings_account_idx
  ON enrichment_provider_mappings (account_id);
