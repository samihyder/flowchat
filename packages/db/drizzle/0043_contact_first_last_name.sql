-- Split contact display name into structured first_name / last_name, while keeping
-- `name` as the source of truth for every existing read path (merge tags, display,
-- search). `name` stays in sync going forward via application code on every
-- create/update that touches either field.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name varchar(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name varchar(255);

-- Backfill from the existing combined name: first word -> first_name, remainder -> last_name.
UPDATE contacts
SET
  first_name = COALESCE(NULLIF(split_part(trim(name), ' ', 1), ''), name),
  last_name = NULLIF(trim(substring(trim(name) from length(split_part(trim(name), ' ', 1)) + 1)), '')
WHERE first_name IS NULL AND last_name IS NULL;
