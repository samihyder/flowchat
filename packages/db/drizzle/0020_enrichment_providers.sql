-- Phase 2: data enrichment providers in connected services

ALTER TABLE account_service_credentials DROP CONSTRAINT IF EXISTS account_service_credentials_category_check;
ALTER TABLE account_service_credentials ADD CONSTRAINT account_service_credentials_category_check
  CHECK (category IN ('email_marketing', 'ai_chat', 'data_enrichment'));

ALTER TABLE account_service_credentials DROP CONSTRAINT IF EXISTS account_service_credentials_provider_check;
ALTER TABLE account_service_credentials ADD CONSTRAINT account_service_credentials_provider_check
  CHECK (provider IN (
    'resend', 'sendgrid', 'mailgun', 'anthropic', 'platform',
    'companies_house', 'lusha', 'openmart', 'cognism', 'people_data_labs', 'explorium'
  ));

-- Optional person-level enrichment snapshot on contacts (provider raw payloads stay server-side)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_status varchar(20)
  CHECK (enrichment_status IS NULL OR enrichment_status IN ('pending', 'enriched', 'partial', 'failed'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_provider varchar(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
