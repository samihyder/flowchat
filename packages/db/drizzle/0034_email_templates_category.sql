-- Template categories for the Templates library (Welcome / Promotional / Nurture / Transactional)

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category varchar(20)
  CHECK (category IS NULL OR category IN ('welcome', 'promotional', 'nurture', 'transactional'));
