-- DAS (Document Automation) — Flow CRM module.
-- Maps former DAS `brands` tenancy onto FlowChat `accounts`.
-- Clients prefer FlowChat `contacts`; optional das_clients kept for catalog-only parties.

CREATE TABLE IF NOT EXISTS das_brand_profiles (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  legal_name varchar(255),
  logo_url text,
  letterhead_url text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS das_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind varchar(50) NOT NULL
    CHECK (kind IN ('stamp', 'seal', 'signature', 'initials', 'logo', 'other')),
  label varchar(255) NOT NULL,
  file_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  storage_key text,
  public_url text,
  signer_name varchar(255),
  signer_title varchar(255),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_assets_account_idx ON das_assets (account_id);

CREATE TABLE IF NOT EXISTS das_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  email varchar(255),
  phone varchar(50),
  company varchar(255),
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_clients_account_idx ON das_clients (account_id);
CREATE INDEX IF NOT EXISTS das_clients_contact_idx ON das_clients (contact_id);

CREATE TABLE IF NOT EXISTS das_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sku varchar(100) NOT NULL,
  sku_auto boolean NOT NULL DEFAULT true,
  name varchar(255) NOT NULL,
  description text,
  base_unit varchar(50),
  unit_price numeric(14, 4) NOT NULL DEFAULT 0,
  currency varchar(10) NOT NULL DEFAULT 'USD',
  price_mode varchar(20) NOT NULL DEFAULT 'fixed'
    CHECK (price_mode IN ('fixed', 'rollup')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, sku)
);

CREATE INDEX IF NOT EXISTS das_products_account_idx ON das_products (account_id);

CREATE TABLE IF NOT EXISTS das_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sku varchar(100) NOT NULL,
  sku_auto boolean NOT NULL DEFAULT true,
  name varchar(255) NOT NULL,
  description text,
  base_unit varchar(50),
  unit_price numeric(14, 4) NOT NULL DEFAULT 0,
  currency varchar(10) NOT NULL DEFAULT 'USD',
  price_mode varchar(20) NOT NULL DEFAULT 'fixed'
    CHECK (price_mode IN ('fixed', 'rollup')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, sku)
);

CREATE INDEX IF NOT EXISTS das_services_account_idx ON das_services (account_id);

CREATE TABLE IF NOT EXISTS das_catalog_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  parent_type varchar(20) NOT NULL CHECK (parent_type IN ('product', 'service')),
  parent_id uuid NOT NULL,
  child_type varchar(20) NOT NULL CHECK (child_type IN ('product', 'service')),
  child_id uuid NOT NULL,
  quantity numeric(14, 4) NOT NULL DEFAULT 1,
  label varchar(255),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_catalog_components_account_idx
  ON das_catalog_components (account_id);
CREATE INDEX IF NOT EXISTS das_catalog_components_parent_idx
  ON das_catalog_components (parent_type, parent_id);

CREATE TABLE IF NOT EXISTS das_catalog_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_type varchar(20) NOT NULL CHECK (item_type IN ('product', 'service')),
  item_id uuid NOT NULL,
  currency varchar(10) NOT NULL,
  unit_price numeric(14, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_id, currency)
);

CREATE INDEX IF NOT EXISTS das_catalog_prices_account_idx ON das_catalog_prices (account_id);

CREATE TABLE IF NOT EXISTS das_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  type varchar(50) NOT NULL
    CHECK (type IN ('quotation', 'invoice', 'proposal', 'sla', 'nda', 'other')),
  version int NOT NULL DEFAULT 1,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  handlebars_html text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_templates_account_idx ON das_templates (account_id);
CREATE INDEX IF NOT EXISTS das_templates_account_type_idx ON das_templates (account_id, type);

CREATE TABLE IF NOT EXISTS das_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  client_id uuid REFERENCES das_clients(id) ON DELETE SET NULL,
  template_id uuid REFERENCES das_templates(id) ON DELETE SET NULL,
  type varchar(50) NOT NULL
    CHECK (type IN ('quotation', 'invoice', 'proposal', 'sla', 'nda', 'other')),
  title varchar(500) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'finalized',
      'archived'
    )),
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  html_snapshot text,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_documents_account_idx ON das_documents (account_id);
CREATE INDEX IF NOT EXISTS das_documents_account_status_idx ON das_documents (account_id, status);
CREATE INDEX IF NOT EXISTS das_documents_contact_idx ON das_documents (contact_id);
CREATE INDEX IF NOT EXISTS das_documents_created_at_idx ON das_documents (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS das_document_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES das_documents(id) ON DELETE CASCADE,
  sha256_hash varchar(128) NOT NULL,
  verification_token varchar(128) NOT NULL UNIQUE,
  qr_payload text,
  link_expires_at timestamptz,
  signature_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_document_security_token_idx
  ON das_document_security (verification_token);

CREATE TABLE IF NOT EXISTS das_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type varchar(100) NOT NULL,
  entity_id uuid NOT NULL,
  action varchar(100) NOT NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS das_audit_logs_account_idx ON das_audit_logs (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS das_audit_logs_entity_idx ON das_audit_logs (entity_type, entity_id);
