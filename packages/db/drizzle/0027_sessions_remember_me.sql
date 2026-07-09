-- Sprint: auth UI parity — "Remember me for 30 days" on sign-in

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS remember_me boolean NOT NULL DEFAULT false;
