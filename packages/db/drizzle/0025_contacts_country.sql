-- Manual country selection for contacts (ISO 3166-1 alpha-2 code)

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS country varchar(2);

CREATE INDEX IF NOT EXISTS idx_contacts_country ON contacts (account_id, country) WHERE country IS NOT NULL;
