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
