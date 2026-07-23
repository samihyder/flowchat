import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** Verify Resend / Svix webhook signatures (whsec_… signing secret). */
export function verifySvixWebhook(payload: string, headers: Headers, secret: string): boolean {
  // Empty secret must never authenticate — callers must reject before send too.
  if (!secret.trim()) return false;

  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const secretKey = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretKey, 'base64');
  } catch {
    return false;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  for (const part of svixSignature.split(' ')) {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) continue;
    try {
      if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return true;
      }
    } catch {
      // signature length mismatch
    }
  }

  return false;
}

/**
 * Shared-secret auth for non-Svix ESPs (SendGrid / Mailgun) until provider-native
 * verification is wired. Accepts `x-webhook-secret` or `Authorization: Bearer …`.
 */
export function verifySharedWebhookSecret(headers: Headers, secret: string): boolean {
  if (!secret.trim()) return false;
  const fromHeader = headers.get('x-webhook-secret')?.trim() ?? '';
  const auth = headers.get('authorization')?.trim() ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const provided = fromHeader || bearer;
  if (!provided) return false;
  return safeEqualString(provided, secret.trim());
}

/** Resend uses Svix (`whsec_…`); other providers use the shared-secret header. */
export function verifyEmailWebhook(
  provider: string,
  payload: string,
  headers: Headers,
  secret: string
): boolean {
  if (!secret.trim()) return false;
  if (provider === 'resend' || secret.trim().startsWith('whsec_')) {
    return verifySvixWebhook(payload, headers, secret);
  }
  return verifySharedWebhookSecret(headers, secret);
}
