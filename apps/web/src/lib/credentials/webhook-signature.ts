import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verify Resend / Svix webhook signatures (whsec_… signing secret). */
export function verifySvixWebhook(payload: string, headers: Headers, secret: string): boolean {
  if (!secret.trim()) return true;

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
