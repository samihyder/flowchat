import { MarketingErrorCode } from '@/lib/marketing/errors';

const CLIENT_MESSAGES: Record<string, string> = {
  [MarketingErrorCode.UNAUTHORIZED]: 'Please sign in to continue.',
  [MarketingErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
  [MarketingErrorCode.LAUNCH_FORBIDDEN]: 'Only an administrator can launch campaigns.',
  [MarketingErrorCode.NOT_FOUND]: 'That campaign or resource could not be found.',
  [MarketingErrorCode.VALIDATION]: 'Please check your input and try again.',
  [MarketingErrorCode.PREFLIGHT_FAILED]: 'Pre-flight checks failed. Review settings before launching.',
  [MarketingErrorCode.TEST_SEND_REQUIRED]: 'Send a test email before launching this campaign.',
  [MarketingErrorCode.RECIPIENTS_REQUIRED]: 'Select at least one recipient with a valid email address.',
  [MarketingErrorCode.ALL_SUPPRESSED]: 'All selected contacts are suppressed or unsubscribed.',
  [MarketingErrorCode.ATTACHMENTS_NOT_ALLOWED]: 'Attachments are not supported in marketing emails.',
  [MarketingErrorCode.MERGE_VALIDATION_FAILED]: 'Fix merge field errors on highlighted steps.',
  [MarketingErrorCode.SCHEDULE_INVALID]: 'Each email must be scheduled after the previous one.',
  [MarketingErrorCode.CONFLICT]: 'This campaign was updated elsewhere. Refresh and try again.',
  [MarketingErrorCode.INTERNAL]: 'Something went wrong. Please try again.',
};

export function marketingErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (CLIENT_MESSAGES[code]) return CLIENT_MESSAGES[code]!;
  }
  if (err instanceof Error && err.message.trim()) {
    const msg = err.message.trim();
    if (msg.length < 200 && !msg.includes('fetch')) return msg;
  }
  return fallback;
}

export function marketingErrorFromResponse(data: {
  code?: string;
  message?: string;
  error?: string;
}): string {
  if (data.code && CLIENT_MESSAGES[data.code]) return CLIENT_MESSAGES[data.code]!;
  return data.message ?? data.error ?? CLIENT_MESSAGES[MarketingErrorCode.INTERNAL]!;
}
