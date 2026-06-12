-- Sprint 5: rich messaging, agent UX, CSAT, search, webhooks, audit

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Messages: private notes, edit/delete, idempotency
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id varchar(64);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_client_id_idx
  ON messages (conversation_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

-- Conversations: KPI timestamps
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Inboxes: CSAT + custom pre-chat fields
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS csat_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS pre_chat_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Visits: referrer for visitor context
ALTER TABLE inbox_visits ADD COLUMN IF NOT EXISTS referrer text;

-- Custom pre-chat field values per visitor session
ALTER TABLE contact_inboxes ADD COLUMN IF NOT EXISTS pre_chat_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  content_type varchar(128) NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  storage_key text NOT NULL,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx ON message_attachments (message_id);

-- Read receipts (agent views contact messages; contact views agent public messages)
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_type varchar(16) NOT NULL,
  reader_id uuid,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (message_id, reader_type, reader_id)
);

-- Canned responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  shortcut varchar(64) NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, shortcut)
);

CREATE INDEX IF NOT EXISTS canned_responses_account_id_idx ON canned_responses (account_id);

-- CSAT
CREATE TABLE IF NOT EXISTS csat_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  inbox_id uuid NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS csat_responses_conversation_id_idx ON csat_responses (conversation_id);

-- Webhooks
CREATE TABLE IF NOT EXISTS account_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret varchar(128) NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES account_webhooks(id) ON DELETE CASCADE,
  event varchar(64) NOT NULL,
  payload jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx ON webhook_deliveries (webhook_id);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(64) NOT NULL,
  resource_type varchar(64) NOT NULL,
  resource_id varchar(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_account_created_idx ON audit_logs (account_id, created_at DESC);

-- Agent mentions in private notes
CREATE TABLE IF NOT EXISTS message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Search helpers
CREATE INDEX IF NOT EXISTS messages_content_trgm_idx ON messages USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx ON contacts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_email_trgm_idx ON contacts USING gin (email gin_trgm_ops);
