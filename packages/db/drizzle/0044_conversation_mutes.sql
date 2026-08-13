-- Per-user conversation mute: silences the message-alert sound/unread badge
-- for one agent's view of a shared conversation, without affecting other
-- agents or the conversation's actual unread/open state.
CREATE TABLE IF NOT EXISTS conversation_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_mutes_user_idx ON conversation_mutes(user_id, account_id);
