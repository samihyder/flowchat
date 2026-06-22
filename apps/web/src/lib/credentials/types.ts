export type ServiceCategory = 'email_marketing' | 'ai_chat';

export type EmailProviderId = 'resend' | 'sendgrid' | 'mailgun';
export type AiProviderId = 'anthropic';
export type ServiceProviderId = EmailProviderId | AiProviderId;

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
