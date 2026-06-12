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
