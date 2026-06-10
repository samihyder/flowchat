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
