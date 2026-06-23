export type ServiceCategory = 'email_marketing' | 'ai_chat' | 'data_enrichment';

export type EmailProviderId = 'resend' | 'sendgrid' | 'mailgun';
export type AiProviderId = 'anthropic';
export type EnrichmentProviderId =
  | 'companies_house'
  | 'lusha'
  | 'openmart'
  | 'cognism'
  | 'people_data_labs'
  | 'explorium';
export type ServiceProviderId = EmailProviderId | AiProviderId | EnrichmentProviderId;

export type CredentialStatus = 'active' | 'invalid' | 'revoked';

export type ServiceCredentialRow = {
  id: string;
  accountId: string;
  category: ServiceCategory;
  provider: ServiceProviderId;
  label: string;
  secretPrefix: string;
  config: Record<string, unknown>;
  status: CredentialStatus;
  isDefault: boolean;
  lastVerifiedAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EmailSendPayload = {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type EmailSendResult =
  | { ok: true; messageId: string; provider: EmailProviderId }
  | { ok: false; error: string };

export type VerifyResult = { ok: true } | { ok: false; error: string };

export const EMAIL_PROVIDERS: { id: EmailProviderId; label: string; hint: string }[] = [
  { id: 'resend', label: 'Resend', hint: 're_… API key from resend.com' },
  { id: 'sendgrid', label: 'SendGrid', hint: 'SG.… API key from sendgrid.com' },
  { id: 'mailgun', label: 'Mailgun', hint: 'API key + sending domain in config' },
];

export const AI_PROVIDERS: { id: AiProviderId; label: string; hint: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', hint: 'sk-ant-… API key' },
];

export const ENRICHMENT_PROVIDERS: {
  id: EnrichmentProviderId;
  label: string;
  hint: string;
  scopes: ('company' | 'person')[];
}[] = [
  {
    id: 'companies_house',
    label: 'Companies House (UK)',
    hint: 'API key from developer.company-information.service.gov.uk',
    scopes: ['company'],
  },
  {
    id: 'people_data_labs',
    label: 'People Data Labs',
    hint: 'API key from peopledatalabs.com',
    scopes: ['company', 'person'],
  },
  {
    id: 'lusha',
    label: 'Lusha',
    hint: 'API key from dashboard.lusha.com',
    scopes: ['company', 'person'],
  },
  {
    id: 'cognism',
    label: 'Cognism',
    hint: 'API key from app.cognism.com',
    scopes: ['company', 'person'],
  },
  {
    id: 'openmart',
    label: 'OpenMart',
    hint: 'API key from openmart.ai',
    scopes: ['company'],
  },
  {
    id: 'explorium',
    label: 'Explorium',
    hint: 'API key from explorium.ai',
    scopes: ['company'],
  },
];
