-- Sprint 7–20 backend foundation (channels, automation, AI, help center, enterprise)
-- Ecosystem note: Lead Monitor / LeadSnapper continue to use integrations/v1 contact sync.
-- WhatsApp Cloud API inbox (S8) is distinct from sibling WhatsApp CRM (whatsapp_crm).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Sprint 7: Email support inbox ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inbox_email_configs (
  inbox_id uuid PRIMARY KEY REFERENCES inboxes(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  forwarding_address text,
  imap_host text,
  imap_port integer DEFAULT 993,
  imap_user text,
  imap_password_encrypted text,
  imap_tls boolean NOT NULL DEFAULT true,
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password_encrypted text,
  smtp_from_email text,
  smtp_from_name text,
  use_resend_outbound boolean NOT NULL DEFAULT true,
  credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL,
  last_polled_at timestamptz,
  poll_cursor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbox_email_configs_account_idx
  ON inbox_email_configs (account_id);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS email_message_id text,
  ADD COLUMN IF NOT EXISTS email_in_reply_to text,
  ADD COLUMN IF NOT EXISTS email_references text,
  ADD COLUMN IF NOT EXISTS email_subject text,
  ADD COLUMN IF NOT EXISTS channel_provider_id text,
  ADD COLUMN IF NOT EXISTS delivery_status varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS messages_email_message_id_account_idx
  ON messages (account_id, email_message_id)
  WHERE email_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_email_in_reply_to_idx
  ON messages (account_id, email_in_reply_to)
  WHERE email_in_reply_to IS NOT NULL;

-- ─── Sprint 8: WhatsApp Cloud API (not WhatsApp CRM sibling) ─────────────────
CREATE TABLE IF NOT EXISTS inbox_whatsapp_configs (
  inbox_id uuid PRIMARY KEY REFERENCES inboxes(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL DEFAULT 'meta_cloud',
  waba_id text,
  phone_number_id text,
  display_phone text,
  access_token_encrypted text,
  verify_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  app_secret_encrypted text,
  webhook_subscribed boolean NOT NULL DEFAULT false,
  last_health_at timestamptz,
  health_status varchar(32) NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inbox_id uuid NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text,
  status text NOT NULL DEFAULT 'APPROVED',
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_template_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inbox_id, name, language)
);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel_window_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS channel_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── Sprint 9: Other channel configs (Messenger, IG, Telegram, SMS, API) ─────
CREATE TABLE IF NOT EXISTS inbox_channel_configs (
  inbox_id uuid PRIMARY KEY REFERENCES inboxes(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel_type varchar(32) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets_encrypted text,
  health_status varchar(32) NOT NULL DEFAULT 'unknown',
  last_health_at timestamptz,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbox_channel_configs_account_type_idx
  ON inbox_channel_configs (account_id, channel_type);

-- ─── Sprint 10: Conversation automation rules + macros ───────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_event varchar(64) NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  group_index integer NOT NULL DEFAULT 0,
  field varchar(64) NOT NULL,
  operator varchar(32) NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb
);

CREATE TABLE IF NOT EXISTS automation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  action_type varchar(64) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS automation_rules_account_trigger_idx
  ON automation_rules (account_id, trigger_event)
  WHERE is_enabled = true;

CREATE TABLE IF NOT EXISTS macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  visibility varchar(16) NOT NULL DEFAULT 'global',
  owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS macros_account_idx ON macros (account_id);

-- ─── Sprint 11–12: Agent bots + Captain AI ───────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  bot_type varchar(32) NOT NULL DEFAULT 'webhook',
  webhook_url text,
  token_hash text,
  avatar_url text,
  inbox_id uuid REFERENCES inboxes(id) ON DELETE SET NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  model text NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  temperature real NOT NULL DEFAULT 0.3,
  guidelines text,
  credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL,
  inbox_id uuid REFERENCES inboxes(id) ON DELETE SET NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES ai_assistants(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type varchar(32) NOT NULL,
  source_url text,
  status varchar(32) NOT NULL DEFAULT 'pending',
  chunk_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_document_chunks_document_idx
  ON ai_document_chunks (document_id, chunk_index);

CREATE TABLE IF NOT EXISTS ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES ai_assistants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tool_type varchar(32) NOT NULL DEFAULT 'builtin',
  http_url text,
  http_method varchar(8) DEFAULT 'POST',
  param_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_copilot_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES ai_assistants(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- ─── Sprint 13: Help Center ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  custom_domain text,
  color varchar(20) DEFAULT '#6366F1',
  logo_url text,
  header_text text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, slug)
);

CREATE TABLE IF NOT EXISTS portal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES portal_categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  category_id uuid REFERENCES portal_categories(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  status varchar(16) NOT NULL DEFAULT 'draft',
  locale varchar(16) NOT NULL DEFAULT 'en',
  meta_description text,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_id, slug, locale)
);

CREATE INDEX IF NOT EXISTS articles_account_status_idx
  ON articles (account_id, status);

-- ─── Sprint 14: Omnichannel campaigns (WA/SMS/widget — not email S6M) ────────
CREATE TABLE IF NOT EXISTS channel_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel_type varchar(32) NOT NULL,
  inbox_id uuid REFERENCES inboxes(id) ON DELETE SET NULL,
  segment_id uuid,
  template_name text,
  template_body text,
  status varchar(32) NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES channel_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status varchar(32) NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS channel_campaigns_account_idx
  ON channel_campaigns (account_id, status);

-- ─── Sprint 15: Reporting events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reporting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  inbox_id uuid REFERENCES inboxes(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(64) NOT NULL,
  value_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reporting_events_account_occurred_idx
  ON reporting_events (account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS reporting_events_account_type_idx
  ON reporting_events (account_id, event_type, occurred_at DESC);

-- ─── Sprint 16: SLA + custom roles + SAML ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  first_response_minutes integer,
  next_response_minutes integer,
  resolution_minutes integer,
  use_business_hours boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inbox_sla_policies (
  inbox_id uuid PRIMARY KEY REFERENCES inboxes(id) ON DELETE CASCADE,
  sla_policy_id uuid NOT NULL REFERENCES sla_policies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_sla_deadlines (
  conversation_id uuid PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  first_response_due_at timestamptz,
  next_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_response_breached_at timestamptz,
  next_response_breached_at timestamptz,
  resolution_breached_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, name)
);

ALTER TABLE account_users
  ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES custom_roles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS account_saml_configs (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  idp_entity_id text,
  idp_sso_url text,
  idp_certificate text,
  sp_entity_id text,
  role_attribute text DEFAULT 'role',
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Sprint 17: Tenant companies + dashboard apps + platform OAuth ───────────
CREATE TABLE IF NOT EXISTS tenant_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text,
  description text,
  custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  global_company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_companies_account_idx
  ON tenant_companies (account_id);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_companies_account_domain_idx
  ON tenant_companies (account_id, domain)
  WHERE domain IS NOT NULL;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS tenant_company_id uuid REFERENCES tenant_companies(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS dashboard_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  embed_url text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_oauth_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Sprint 18/20: Mobile push tokens + API rate budgets ─────────────────────
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform varchar(16) NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE TABLE IF NOT EXISTS account_rate_limits (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  requests_per_minute integer NOT NULL DEFAULT 600,
  burst integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now()
);
