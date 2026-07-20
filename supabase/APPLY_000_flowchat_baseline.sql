-- FlowChat baseline schema for Supabase project ozetivcvfszayotcimbw
-- Generated from packages/db/drizzle/0000..0039 (Phase 1: Neon → Supabase)
-- Apply once on an empty database via Supabase SQL Editor, or:
--   psql "$DIRECT_URL" -f supabase/APPLY_000_flowchat_baseline.sql
--
-- Requires: gen_random_uuid() (available by default on Supabase)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 0000_concerned_speedball.sql ==========
CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'trial');
CREATE TYPE "public"."agent_role" AS ENUM('administrator', 'agent');
CREATE TYPE "public"."availability_status" AS ENUM('online', 'busy', 'offline');
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain" varchar(255),
	"logo_url" text,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"status" "account_status" DEFAULT 'trial' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_slug_unique" UNIQUE("slug")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"email_verified_at" timestamp with time zone,
	"totp_secret" text,
	"totp_enabled_at" timestamp with time zone,
	"backup_codes" text[],
	"google_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);

CREATE TABLE "account_users" (
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "agent_role" DEFAULT 'agent' NOT NULL,
	"availability" "availability_status" DEFAULT 'offline' NOT NULL,
	"display_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_users_account_id_user_id_pk" PRIMARY KEY("account_id","user_id")
);

CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);

ALTER TABLE "account_users" ADD CONSTRAINT "account_users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "account_users" ADD CONSTRAINT "account_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- ========== 0001_sprint2_inboxes_teams.sql ==========
CREATE TYPE "public"."channel_type" AS ENUM('web_widget', 'email', 'whatsapp', 'facebook', 'instagram', 'telegram', 'sms', 'api');
CREATE TABLE "inboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"channel_type" "channel_type" DEFAULT 'web_widget' NOT NULL,
	"avatar_url" text,
	"greeting_message" text,
	"welcome_title" varchar(255),
	"welcome_tagline" varchar(255),
	"widget_color" varchar(20) DEFAULT '#1F93FF',
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "inbox_members" (
	"inbox_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_members_inbox_id_user_id_pk" PRIMARY KEY("inbox_id","user_id")
);

CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);

ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "inbox_members" ADD CONSTRAINT "inbox_members_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "inbox_members" ADD CONSTRAINT "inbox_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "teams" ADD CONSTRAINT "teams_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- ========== 0002_sprint3_conversations.sql ==========
CREATE TYPE "public"."contact_type" AS ENUM('visitor', 'lead', 'customer');
CREATE TYPE "public"."conversation_status" AS ENUM('open', 'pending', 'resolved', 'snoozed');
CREATE TYPE "public"."sender_type" AS ENUM('contact', 'agent', 'system');
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"type" "contact_type" DEFAULT 'visitor' NOT NULL,
	"avatar_url" text,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "contact_inboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"inbox_id" uuid NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"visitor_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_inboxes_visitor_token_unique" UNIQUE("visitor_token")
);

CREATE UNIQUE INDEX "contact_inboxes_inbox_source_idx" ON "contact_inboxes" USING btree ("inbox_id","source_id");
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"inbox_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" "conversation_status" DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sender_type" "sender_type" NOT NULL,
	"sender_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contact_inboxes" ADD CONSTRAINT "contact_inboxes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contact_inboxes" ADD CONSTRAINT "contact_inboxes_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;

-- ========== 0003_widget_customization.sql ==========
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS widget_icon varchar(32) DEFAULT 'chat';
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS widget_theme jsonb;

-- ========== 0004_analytics_and_assignee.sql ==========
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS website_url varchar(500);
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS default_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE contact_inboxes ADD COLUMN IF NOT EXISTS last_ip_address varchar(45);
ALTER TABLE contact_inboxes ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS inbox_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  inbox_id uuid NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  ip_address varchar(45),
  user_agent text,
  source_id varchar(255),
  page_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS inbox_visits_inbox_created_idx ON inbox_visits (inbox_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inbox_visits_inbox_ip_idx ON inbox_visits (inbox_id, ip_address);

-- ========== 0005_agent_approval.sql ==========
DO $$ BEGIN
  CREATE TYPE account_user_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE account_users ADD COLUMN IF NOT EXISTS status account_user_status NOT NULL DEFAULT 'active';

UPDATE account_users SET status = 'active' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS agent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role agent_role NOT NULL DEFAULT 'agent',
  token varchar(64) NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS agent_invites_token_idx ON agent_invites (token);
CREATE INDEX IF NOT EXISTS agent_invites_account_email_idx ON agent_invites (account_id, email);

-- ========== 0006_sprint4_lifecycle.sql ==========
DO $$ BEGIN
  CREATE TYPE conversation_priority AS ENUM ('urgent', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority conversation_priority NOT NULL DEFAULT 'medium';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS snoozed_until timestamp with time zone;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  color varchar(20) NOT NULL DEFAULT '#6366F1',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(account_id, name)
);

CREATE TABLE IF NOT EXISTS conversation_labels (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);

ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS allowed_domains jsonb DEFAULT '[]'::jsonb;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS business_hours jsonb;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS offline_message text;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS privacy_policy_url text;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS require_consent boolean NOT NULL DEFAULT false;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS round_robin_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inbox_id uuid REFERENCES inboxes(id) ON DELETE CASCADE,
  ip_address varchar(45) NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS blocked_ips_lookup_idx ON blocked_ips (account_id, ip_address);

CREATE TABLE IF NOT EXISTS inbox_round_robin_state (
  inbox_id uuid PRIMARY KEY REFERENCES inboxes(id) ON DELETE CASCADE,
  last_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ========== 0007_sprint4_completion.sql ==========
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS awaiting_reply_since timestamp with time zone;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS missed_alert_sent_at timestamp with time zone;

ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS missed_chat_minutes integer NOT NULL DEFAULT 5;
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS use_business_hours boolean NOT NULL DEFAULT false;

-- ========== 0008_analytics_exceptions.sql ==========
DO $$ BEGIN
  CREATE TYPE analytics_exception_type AS ENUM ('ip', 'machine');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS inbox_analytics_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inbox_id uuid NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  exception_type analytics_exception_type NOT NULL,
  value varchar(255) NOT NULL,
  label text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(inbox_id, exception_type, value)
);

CREATE INDEX IF NOT EXISTS inbox_analytics_exceptions_inbox_idx
  ON inbox_analytics_exceptions (inbox_id);

-- ========== 0009_sprint5_messaging.sql ==========
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

-- ========== 0010_sprint6_crm.sql ==========
-- Sprint 6: CRM contacts, notes, contact labels

CREATE TABLE IF NOT EXISTS contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_notes_contact_id_idx ON contact_notes (contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_labels (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, label_id)
);

CREATE INDEX IF NOT EXISTS contacts_account_type_idx ON contacts (account_id, type);
CREATE INDEX IF NOT EXISTS contacts_account_last_activity_idx ON contacts (account_id, last_activity_at DESC NULLS LAST);

-- ========== 0011_crm_integrations.sql ==========
-- CRM integrations: API keys + external contact IDs for sync

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_account_external_id_idx
  ON contacts (account_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS account_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  key_hash text NOT NULL,
  key_prefix varchar(24) NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["contacts:read","contacts:write"]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS account_api_keys_account_id_idx ON account_api_keys (account_id);

-- ========== 0012_sprint6_crm_complete.sql ==========
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

-- ========== 0013_sprint6_email_marketing.sql ==========
-- Sprint 6: Email marketing automation

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_status varchar(20) NOT NULL DEFAULT 'subscribed'
  CHECK (marketing_status IN ('subscribed', 'unsubscribed', 'bounced', 'complained'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;

CREATE TABLE IF NOT EXISTS marketing_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  segment_type varchar(20) NOT NULL DEFAULT 'static' CHECK (segment_type IN ('static', 'dynamic')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_segments_account_idx ON marketing_segments (account_id);

CREATE TABLE IF NOT EXISTS marketing_segment_members (
  segment_id uuid NOT NULL REFERENCES marketing_segments(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, contact_id)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  subject varchar(500) NOT NULL,
  html_body text NOT NULL,
  text_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_account_idx ON email_templates (account_id);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES marketing_segments(id) ON DELETE SET NULL,
  subject varchar(500) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  opened_count int NOT NULL DEFAULT 0,
  clicked_count int NOT NULL DEFAULT 0,
  bounced_count int NOT NULL DEFAULT 0,
  complained_count int NOT NULL DEFAULT 0,
  unsubscribed_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_campaigns_account_idx ON email_campaigns (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  email varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'skipped')),
  resend_message_id varchar(255),
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_campaign_idx ON email_campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS email_campaign_recipients_resend_idx ON email_campaign_recipients (resend_message_id);

CREATE TABLE IF NOT EXISTS contact_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE SET NULL,
  event_type varchar(50) NOT NULL,
  subject varchar(500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_email_events_contact_idx ON contact_email_events (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_email_events_campaign_idx ON contact_email_events (campaign_id);

CREATE TABLE IF NOT EXISTS marketing_unsubscribe_tokens (
  token varchar(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== 0014_sprint6_email_phase2.sql ==========
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

-- ========== 0015_sprint6_complete.sql ==========
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

-- ========== 0016_sprint6_stretch.sql ==========
-- Sprint 6 stretch: send-time optimization, preferences, A/B winner phase

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone varchar(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_preference varchar(20) NOT NULL DEFAULT 'all'
  CHECK (marketing_preference IN ('all', 'reduced', 'none'));

ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS use_send_time_optimization boolean NOT NULL DEFAULT false;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS send_window_start int NOT NULL DEFAULT 9;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS send_window_end int NOT NULL DEFAULT 17;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_phase varchar(20) NOT NULL DEFAULT 'none'
  CHECK (ab_test_phase IN ('none', 'testing', 'winner_sent'));
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_winner_variant varchar(1);
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_winner_after_hours int NOT NULL DEFAULT 24;

-- ========== 0017_visitor_geo_greetings.sql ==========
-- Visitor geo + multi-message greetings

ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS greeting_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE inbox_visits ADD COLUMN IF NOT EXISTS country_code varchar(2);

ALTER TABLE contact_inboxes ADD COLUMN IF NOT EXISTS country_code varchar(2);

CREATE INDEX IF NOT EXISTS inbox_visits_inbox_country_idx ON inbox_visits (inbox_id, country_code);

-- ========== 0018_tenant_service_credentials.sql ==========
-- Sprint 7: tenant-owned service credentials (BYOK)

CREATE TABLE IF NOT EXISTS account_service_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category varchar(50) NOT NULL
    CHECK (category IN ('email_marketing', 'ai_chat')),
  provider varchar(50) NOT NULL
    CHECK (provider IN ('resend', 'sendgrid', 'mailgun', 'anthropic', 'platform')),
  label varchar(255) NOT NULL,
  secret_ciphertext text NOT NULL,
  secret_iv text NOT NULL,
  secret_tag text NOT NULL,
  secret_prefix varchar(32) NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invalid', 'revoked')),
  is_default boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  last_used_at timestamptz,
  usage_count bigint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_service_credentials_account_idx
  ON account_service_credentials (account_id);
CREATE INDEX IF NOT EXISTS account_service_credentials_category_idx
  ON account_service_credentials (account_id, category);

ALTER TABLE marketing_senders
  ADD COLUMN IF NOT EXISTS credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL;

ALTER TABLE email_campaign_recipients
  ADD COLUMN IF NOT EXISTS provider varchar(50),
  ADD COLUMN IF NOT EXISTS provider_message_id varchar(255);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_provider_msg_idx
  ON email_campaign_recipients (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- ========== 0019_global_companies.sql ==========
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

-- ========== 0020_enrichment_providers.sql ==========
-- Phase 2: data enrichment providers in connected services

ALTER TABLE account_service_credentials DROP CONSTRAINT IF EXISTS account_service_credentials_category_check;
ALTER TABLE account_service_credentials ADD CONSTRAINT account_service_credentials_category_check
  CHECK (category IN ('email_marketing', 'ai_chat', 'data_enrichment'));

ALTER TABLE account_service_credentials DROP CONSTRAINT IF EXISTS account_service_credentials_provider_check;
ALTER TABLE account_service_credentials ADD CONSTRAINT account_service_credentials_provider_check
  CHECK (provider IN (
    'resend', 'sendgrid', 'mailgun', 'anthropic', 'platform',
    'companies_house', 'lusha', 'openmart', 'cognism', 'people_data_labs', 'explorium'
  ));

-- Optional person-level enrichment snapshot on contacts (provider raw payloads stay server-side)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_status varchar(20)
  CHECK (enrichment_status IS NULL OR enrichment_status IN ('pending', 'enriched', 'partial', 'failed'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_provider varchar(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- ========== 0021_contact_enrichment_suggestions.sql ==========
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

-- ========== 0022_s6m_campaigns.sql ==========
-- S6M: Campaign-centric marketing wizard (parallel to legacy email_campaigns)

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Campaign',
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  launched_by uuid REFERENCES users(id) ON DELETE SET NULL,
  launched_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  test_sent_at timestamptz,
  test_sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
  test_sent_to text,
  from_name text,
  from_email text,
  reply_to text,
  signature_html text,
  use_workspace_signature boolean NOT NULL DEFAULT true,
  meeting_link text,
  portfolio_link text,
  credential_id uuid REFERENCES account_service_credentials(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS marketing_campaigns_account_status_idx
  ON marketing_campaigns (account_id, status);

CREATE TABLE IF NOT EXISTS marketing_campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  step_order smallint NOT NULL,
  send_at timestamptz,
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  plain_body text,
  merge_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  save_as_template boolean NOT NULL DEFAULT false,
  template_name text,
  snapshot_at timestamptz,
  source_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, step_order)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_steps_campaign_idx
  ON marketing_campaign_steps (campaign_id, step_order);

CREATE TABLE IF NOT EXISTS marketing_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  stopped_reason varchar(20) CHECK (
    stopped_reason IS NULL OR stopped_reason IN ('bounce', 'unsubscribe', 'reply', 'complaint')
  ),
  stopped_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_recipients_campaign_idx
  ON marketing_campaign_recipients (campaign_id);

CREATE INDEX IF NOT EXISTS marketing_campaign_recipients_stopped_idx
  ON marketing_campaign_recipients (campaign_id, stopped_reason);

CREATE TABLE IF NOT EXISTS marketing_campaign_recipient_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  campaign_step_id uuid NOT NULL REFERENCES marketing_campaign_steps(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES marketing_campaign_recipients(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'failed',
      'stopped_bounce', 'stopped_unsubscribe', 'stopped_reply', 'stopped_complaint', 'skipped'
    )),
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  retry_count smallint NOT NULL DEFAULT 0,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, campaign_step_id)
);

CREATE INDEX IF NOT EXISTS marketing_campaign_recipient_steps_due_idx
  ON marketing_campaign_recipient_steps (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS marketing_campaign_recipient_steps_provider_msg_idx
  ON marketing_campaign_recipient_steps (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_campaign_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES marketing_campaign_recipients(id) ON DELETE SET NULL,
  step_id uuid REFERENCES marketing_campaign_steps(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_campaign_activity_campaign_idx
  ON marketing_campaign_activity (campaign_id, created_at DESC);

-- ========== 0023_marketing_system_state.sql ==========
-- S6M-9: Cron health + system state for marketing scheduler

CREATE TABLE IF NOT EXISTS marketing_system_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== 0024_marketing_campaign_timezone.sql ==========
-- Campaign schedule timezone + per-recipient local delivery mode (S6M)

ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS schedule_timezone varchar(100) NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS schedule_mode varchar(20) NOT NULL DEFAULT 'recipient_local'
    CHECK (schedule_mode IN ('campaign', 'recipient_local'));

-- ========== 0025_contacts_country.sql ==========
-- Manual country selection for contacts (ISO 3166-1 alpha-2 code)

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS country varchar(2);

CREATE INDEX IF NOT EXISTS idx_contacts_country ON contacts (account_id, country) WHERE country IS NOT NULL;

-- ========== 0026_contacts_assignment_and_tasks.sql ==========
-- Contact routing/assignment (mirrors conversations.assignee_id / conversations.team_id)
-- and a minimal manual contact_tasks table (no auto-trigger creation yet).

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_assignee_id ON contacts (account_id, assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_team_id ON contacts (account_id, team_id) WHERE team_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS contact_tasks_contact_id_idx ON contact_tasks (contact_id, status, due_at);

-- ========== 0027_sessions_remember_me.sql ==========
-- Sprint: auth UI parity — "Remember me for 30 days" on sign-in

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS remember_me boolean NOT NULL DEFAULT false;

-- ========== 0028_password_reset_tokens.sql ==========
-- Sprint: auth UI parity — "Forgot password?" flow

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token varchar(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id);

-- ========== 0029_sessions_device_tracking.sql ==========
-- Settings audit: Active Sessions list + revoke (security settings)

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

-- ========== 0030_blocked_reason.sql ==========
-- Settings audit: Blocked visitors admin UI needs a reason on contact blocks (blocked_ips already has reason)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS blocked_reason text;

-- ========== 0031_audit_logs_ip.sql ==========
-- Settings audit: Audit Log IP column (wireframe 18)

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address text;

-- ========== 0032_custom_attribute_required.sql ==========
-- Settings audit: custom attribute "Required" field + edit support (wireframe 23)

ALTER TABLE custom_attribute_definitions ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;

-- ========== 0033_teams_auto_assignment.sql ==========
-- Settings audit: teams auto-assignment flag + wireframe conversation-count stat.
-- Note: conversations.team_id already exists (0006_sprint4_lifecycle.sql) but was never wired up anywhere;
-- this migration only adds the toggle. The routing engine itself is a separate, bigger feature (not built here).

ALTER TABLE teams ADD COLUMN IF NOT EXISTS auto_assignment boolean NOT NULL DEFAULT false;

-- ========== 0034_email_templates_category.sql ==========
-- Template categories for the Templates library (Welcome / Promotional / Nurture / Transactional)

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category varchar(20)
  CHECK (category IS NULL OR category IN ('welcome', 'promotional', 'nurture', 'transactional'));

-- ========== 0035_campaign_rate_limit_bounce_toggle.sql ==========
-- Per-campaign send-rate throttling and bounce/unsubscribe handling toggles

ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS send_rate_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS send_rate_per_hour int NOT NULL DEFAULT 500;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS auto_mark_bounced boolean NOT NULL DEFAULT true;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS process_unsubscribes boolean NOT NULL DEFAULT true;

-- ========== 0036_super_admin.sql ==========
-- Platform-level super admin: can access any tenant's workspace with full admin rights

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- ========== 0037_api_catalog.sql ==========
-- Super-admin API observability catalog: rich-text usage notes per discovered API route

CREATE TABLE IF NOT EXISTS api_catalog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  method varchar(10) NOT NULL,
  description_html text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path, method)
);

-- ========== 0038_account_integrations.sql ==========
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

-- ========== 0039_enrichment_flows.sql ==========
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
