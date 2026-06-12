-- Sprint 6 completion: custom attributes, import jobs, conversation participants

CREATE TABLE IF NOT EXISTS custom_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type varchar(20) NOT NULL CHECK (entity_type IN ('contact', 'conversation')),
  key varchar(100) NOT NULL,
  label varchar(255) NOT NULL,
  attr_type varchar(20) NOT NULL CHECK (attr_type IN ('text', 'number', 'date', 'select', 'boolean')),
  options jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, entity_type, key)
);

CREATE INDEX IF NOT EXISTS custom_attribute_definitions_account_idx
  ON custom_attribute_definitions (account_id, entity_type, sort_order);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS contact_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  csv_text text NOT NULL,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  upsert_by_email boolean NOT NULL DEFAULT false,
  total_rows int NOT NULL DEFAULT 0,
  processed_rows int NOT NULL DEFAULT 0,
  imported_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS contact_import_jobs_account_idx
  ON contact_import_jobs (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL DEFAULT 'observer' CHECK (role IN ('observer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_participants_user_idx
  ON conversation_participants (user_id);
