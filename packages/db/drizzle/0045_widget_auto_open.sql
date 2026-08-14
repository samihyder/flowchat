-- Widget auto-open: panel opens itself on page load instead of waiting for a
-- launcher click. Opt-in, DEFAULT false keeps existing embedded widgets on
-- today's click-to-open behavior.
ALTER TABLE inboxes
  ADD COLUMN IF NOT EXISTS auto_open_chat boolean NOT NULL DEFAULT false;
