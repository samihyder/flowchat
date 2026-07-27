-- Hosted (default FlowChat UI) vs headless (connectivity / custom UI only).
-- DEFAULT 'hosted' keeps existing tenants on the current embed widget.
ALTER TABLE inboxes
  ADD COLUMN IF NOT EXISTS widget_mode varchar(20) NOT NULL DEFAULT 'hosted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inboxes_widget_mode_check'
  ) THEN
    ALTER TABLE inboxes
      ADD CONSTRAINT inboxes_widget_mode_check
      CHECK (widget_mode IN ('hosted', 'headless'));
  END IF;
END $$;
