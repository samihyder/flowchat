-- Global B2B company registry (shared across all tenants), keyed by email domain.

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain varchar(255) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  website text,
  logo_url text,
  hq_city varchar(120),
  hq_region varchar(120),
  hq_country varchar(120),
  hq_address text,
  industry varchar(255),
  linkedin_url text,
  phone varchar(50),
  enrichment_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'enriched', 'partial', 'failed')),
  enrichment_provider varchar(50),
  enrichment_error text,
  enriched_at timestamptz,
  first_discovered_by_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  raw_enrichment jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contacts_company_id_idx ON contacts (company_id);
