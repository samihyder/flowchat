import type { EmailProviderId } from '@/lib/credentials/types';
import { mailgunEmailProvider } from '@/lib/credentials/providers/email/mailgun';
import { resendEmailProvider } from '@/lib/credentials/providers/email/resend';
import { sendgridEmailProvider } from '@/lib/credentials/providers/email/sendgrid';
import type { EmailProviderAdapter } from '@/lib/credentials/providers/email/types';

const adapters: Record<EmailProviderId, EmailProviderAdapter> = {
  resend: resendEmailProvider,
  sendgrid: sendgridEmailProvider,
  mailgun: mailgunEmailProvider,
};

export function getEmailProvider(provider: EmailProviderId): EmailProviderAdapter {
  return adapters[provider];
}

export async function verifyEmailCredential(
  provider: EmailProviderId,
  apiKey: string,
  config: Record<string, unknown>
) {
  return getEmailProvider(provider).verify({ apiKey, config });
}

export async function sendViaEmailProvider(
  provider: EmailProviderId,
  apiKey: string,
  config: Record<string, unknown>,
  payload: Parameters<EmailProviderAdapter['send']>[1]
) {
  return getEmailProvider(provider).send({ apiKey, config }, payload);
}

export async function checkEmailDomain(
  provider: EmailProviderId,
  apiKey: string,
  config: Record<string, unknown>,
  fromEmail: string
) {
  const adapter = getEmailProvider(provider);
  if (!adapter.checkDomain) return 'unknown' as const;
  return adapter.checkDomain({ apiKey, config }, fromEmail);
}
