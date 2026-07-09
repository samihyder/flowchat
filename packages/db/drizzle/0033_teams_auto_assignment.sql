-- Settings audit: teams auto-assignment flag + wireframe conversation-count stat.
-- Note: conversations.team_id already exists (0006_sprint4_lifecycle.sql) but was never wired up anywhere;
-- this migration only adds the toggle. The routing engine itself is a separate, bigger feature (not built here).

ALTER TABLE teams ADD COLUMN IF NOT EXISTS auto_assignment boolean NOT NULL DEFAULT false;
