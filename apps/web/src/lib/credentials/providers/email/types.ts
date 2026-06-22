import type { EmailProviderId, EmailSendPayload, EmailSendResult, VerifyResult } from '@/lib/credentials/types';

export type EmailProviderContext = {
  apiKey: string;
  config: Record<string, unknown>;
};

export interface EmailProviderAdapter {
  id: EmailProviderId;
  verify(ctx: EmailProviderContext): Promise<VerifyResult>;
  send(ctx: EmailProviderContext, payload: EmailSendPayload): Promise<EmailSendResult>;
  checkDomain?(ctx: EmailProviderContext, fromEmail: string): Promise<'verified' | 'pending' | 'unknown' | 'failed'>;
}
