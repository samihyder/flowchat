-- Visitor geo + multi-message greetings

ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS greeting_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE inbox_visits ADD COLUMN IF NOT EXISTS country_code varchar(2);

ALTER TABLE contact_inboxes ADD COLUMN IF NOT EXISTS country_code varchar(2);

CREATE INDEX IF NOT EXISTS inbox_visits_inbox_country_idx ON inbox_visits (inbox_id, country_code);
