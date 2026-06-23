import type { EnrichmentProviderId } from '@/lib/credentials/types';

/** Internal classification — never expose raw provider bodies to the client. */
export type EnrichmentErrorCode =
  | 'credential_invalid'
  | 'credential_not_found'
  | 'credential_inactive'
  | 'provider_mismatch'
  | 'provider_unavailable'
  | 'not_found'
  | 'rate_limited'
  | 'insufficient_credits'
  | 'permission_denied'
  | 'invalid_request'
  | 'no_corporate_domain'
  | 'company_not_linked'
  | 'unsupported_scope'
  | 'partial_data'
  | 'unknown';

export type EnrichmentError = {
  code: EnrichmentErrorCode;
  message: string;
  status: number;
  detail?: string;
};

const PROVIDER_LABELS: Record<EnrichmentProviderId, string> = {
  companies_house: 'Companies House',
  lusha: 'Lusha',
  openmart: 'OpenMart',
  cognism: 'Cognism',
  people_data_labs: 'People Data Labs',
  explorium: 'Explorium',
};

export function providerLabel(id: EnrichmentProviderId): string {
  return PROVIDER_LABELS[id] ?? id;
}

function scrubSensitiveText(input: string): string {
  return input
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/re_[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/SG\.[a-zA-Z0-9._-]{8,}/g, '[redacted]')
    .replace(/[a-f0-9]{32,}/gi, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[redacted]')
    .trim();
}

function classifyHttpStatus(status: number, bodyText: string): EnrichmentErrorCode {
  const lower = bodyText.toLowerCase();
  if (status === 401 || status === 403) {
    if (lower.includes('credit') || lower.includes('quota') || lower.includes('balance')) {
      return 'insufficient_credits';
    }
    if (status === 403) return 'permission_denied';
    return 'credential_invalid';
  }
  if (status === 404 || lower.includes('not found') || lower.includes('no match')) {
    return 'not_found';
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many')) {
    return 'rate_limited';
  }
  if (status === 402 || lower.includes('payment') || lower.includes('credits')) {
    return 'insufficient_credits';
  }
  if (status >= 500) return 'provider_unavailable';
  if (status === 400 || status === 422) return 'invalid_request';
  return 'unknown';
}

const USER_MESSAGES: Record<EnrichmentErrorCode, string> = {
  credential_invalid:
    'The selected enrichment API key is invalid or expired. Check Connected services and test the connection.',
  credential_not_found: 'No enrichment connection was found. Add one in Settings → Connected services.',
  credential_inactive:
    'The selected enrichment connection is inactive. Re-test or update the API key in Connected services.',
  provider_mismatch: 'The selected connection does not match the chosen provider.',
  provider_unavailable: 'The enrichment provider is temporarily unavailable. Try again in a few minutes.',
  not_found: 'No matching company or person was found for this contact.',
  rate_limited: 'The enrichment provider rate limit was reached. Wait a moment and try again.',
  insufficient_credits: 'Your enrichment provider account has no remaining credits or quota.',
  permission_denied: 'Your enrichment API key does not have permission for this request.',
  invalid_request: 'The enrichment request could not be processed. Check the contact email and try again.',
  no_corporate_domain:
    'This contact uses a personal email address — enrichment requires a corporate domain.',
  company_not_linked: 'No company is linked to this contact yet. Save the contact with a corporate email first.',
  unsupported_scope: 'This provider does not support the requested enrichment type.',
  partial_data: 'Enrichment returned incomplete data. Some fields may be missing.',
  unknown: 'Enrichment failed. Try another provider or contact your administrator.',
};

export function enrichmentError(
  code: EnrichmentErrorCode,
  opts?: { provider?: EnrichmentProviderId; detail?: string; status?: number }
): EnrichmentError {
  const base = USER_MESSAGES[code];
  const message =
    opts?.provider && code !== 'unknown'
      ? `${providerLabel(opts.provider)}: ${base}`
      : base;
  const status =
    opts?.status ??
    (code === 'not_found'
      ? 404
      : code === 'rate_limited'
        ? 429
        : code === 'credential_invalid' ||
            code === 'credential_not_found' ||
            code === 'credential_inactive' ||
            code === 'permission_denied'
          ? 400
          : code === 'no_corporate_domain' ||
              code === 'company_not_linked' ||
              code === 'invalid_request' ||
              code === 'unsupported_scope' ||
              code === 'provider_mismatch'
            ? 400
            : code === 'provider_unavailable'
              ? 502
              : 500);

  return {
    code,
    message,
    status,
    detail: opts?.detail ? scrubSensitiveText(opts.detail) : undefined,
  };
}

export function enrichmentErrorFromHttp(
  provider: EnrichmentProviderId,
  status: number,
  body: unknown
): EnrichmentError {
  const bodyText =
    typeof body === 'string'
      ? body
      : typeof body === 'object' && body !== null
        ? JSON.stringify(body)
        : '';
  const code = classifyHttpStatus(status, bodyText);
  const detail = scrubSensitiveText(
    typeof body === 'object' && body !== null && 'message' in body
      ? String((body as { message?: string }).message ?? bodyText).slice(0, 500)
      : bodyText.slice(0, 500)
  );
  return enrichmentError(code, { provider, detail, status: code === 'unknown' ? 502 : undefined });
}

export function enrichmentErrorFromException(
  provider: EnrichmentProviderId,
  err: unknown
): EnrichmentError {
  const detail = err instanceof Error ? scrubSensitiveText(err.message) : 'Unknown error';
  if (detail.toLowerCase().includes('fetch') || detail.toLowerCase().includes('network')) {
    return enrichmentError('provider_unavailable', { provider, detail });
  }
  return enrichmentError('unknown', { provider, detail });
}

export function enrichmentErrorResponse(err: EnrichmentError) {
  return { ok: false as const, error: err.message, code: err.code };
}
