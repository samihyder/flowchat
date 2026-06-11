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
