-- Staged enrichment suggestions: fetch via API, user selects fields to apply.

CREATE TABLE IF NOT EXISTS contact_enrichment_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL,
  provider varchar(50) NOT NULL,
  scope varchar(20) NOT NULL CHECK (scope IN ('company', 'person', 'both')),
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  applied_at timestamptz,
  applied_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_enrichment_suggestions_contact_idx
  ON contact_enrichment_suggestions (contact_id, status);
CREATE INDEX IF NOT EXISTS contact_enrichment_suggestions_account_idx
  ON contact_enrichment_suggestions (account_id, status);
