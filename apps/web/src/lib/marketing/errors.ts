/** S6M marketing API errors — safe client-facing messages (S6M-31). */

export const MarketingErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  PREFLIGHT_FAILED: 'PREFLIGHT_FAILED',
  TEST_SEND_REQUIRED: 'TEST_SEND_REQUIRED',
  LAUNCH_FORBIDDEN: 'LAUNCH_FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
  RECIPIENTS_REQUIRED: 'RECIPIENTS_REQUIRED',
  ALL_SUPPRESSED: 'ALL_SUPPRESSED',
  ATTACHMENTS_NOT_ALLOWED: 'ATTACHMENTS_NOT_ALLOWED',
  MERGE_VALIDATION_FAILED: 'MERGE_VALIDATION_FAILED',
  SCHEDULE_INVALID: 'SCHEDULE_INVALID',
} as const;

export type MarketingErrorCode = (typeof MarketingErrorCode)[keyof typeof MarketingErrorCode];

const DEFAULT_MESSAGES: Record<MarketingErrorCode, string> = {
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Campaign not found.',
  VALIDATION: 'Please check your input and try again.',
  PREFLIGHT_FAILED: 'Pre-flight checks failed. Fix the issues in settings before launching.',
  TEST_SEND_REQUIRED: 'Send a test email before launching this campaign.',
  LAUNCH_FORBIDDEN: 'Only an administrator can launch campaigns.',
  CONFLICT: 'This campaign was updated elsewhere. Refresh and try again.',
  INTERNAL: 'Something went wrong. Please try again.',
  RECIPIENTS_REQUIRED: 'Select at least one recipient with a valid email address.',
  ALL_SUPPRESSED: 'All selected contacts are suppressed or unsubscribed. Choose different recipients.',
  ATTACHMENTS_NOT_ALLOWED: 'Attachments are not supported in marketing emails.',
  MERGE_VALIDATION_FAILED: 'Fix merge field errors on highlighted steps.',
  SCHEDULE_INVALID: 'Each email must be scheduled after the previous one.',
};

export class MarketingError extends Error {
  readonly code: MarketingErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: MarketingErrorCode,
    options?: { message?: string; status?: number; details?: Record<string, unknown> }
  ) {
    super(options?.message ?? DEFAULT_MESSAGES[code]);
    this.name = 'MarketingError';
    this.code = code;
    this.status = options?.status ?? marketingErrorStatus(code);
    this.details = options?.details;
  }
}

function marketingErrorStatus(code: MarketingErrorCode): number {
  switch (code) {
    case MarketingErrorCode.UNAUTHORIZED:
      return 401;
    case MarketingErrorCode.FORBIDDEN:
    case MarketingErrorCode.LAUNCH_FORBIDDEN:
      return 403;
    case MarketingErrorCode.NOT_FOUND:
      return 404;
    case MarketingErrorCode.VALIDATION:
    case MarketingErrorCode.PREFLIGHT_FAILED:
    case MarketingErrorCode.TEST_SEND_REQUIRED:
      return 400;
    case MarketingErrorCode.RECIPIENTS_REQUIRED:
    case MarketingErrorCode.ALL_SUPPRESSED:
    case MarketingErrorCode.ATTACHMENTS_NOT_ALLOWED:
    case MarketingErrorCode.MERGE_VALIDATION_FAILED:
    case MarketingErrorCode.SCHEDULE_INVALID:
      return 400;
    case MarketingErrorCode.CONFLICT:
      return 409;
    default:
      return 500;
  }
}

export function marketingErrorResponse(err: unknown): Response {
  if (err instanceof MarketingError) {
    return Response.json(
      { code: err.code, message: err.message, details: err.details },
      { status: err.status }
    );
  }
  console.error('[marketing]', err);
  return Response.json(
    { code: MarketingErrorCode.INTERNAL, message: DEFAULT_MESSAGES.INTERNAL },
    { status: 500 }
  );
}
