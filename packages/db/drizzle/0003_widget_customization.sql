ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS widget_icon varchar(32) DEFAULT 'chat';
ALTER TABLE inboxes ADD COLUMN IF NOT EXISTS widget_theme jsonb;
