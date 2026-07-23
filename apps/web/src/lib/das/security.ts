import { createHash, randomBytes } from 'crypto';

export function hashHtml(html: string): string {
  return createHash('sha256').update(html, 'utf8').digest('hex');
}

export function newVerificationToken(): string {
  return randomBytes(24).toString('base64url');
}

export function verifyUrlForToken(token: string, origin?: string): string {
  const base = (
    origin ||
    process.env.WEB_APP_URL ||
    process.env.NEXT_PUBLIC_WEB_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  ).replace(/\/$/, '');
  return base ? `${base}/verify/${token}` : `/verify/${token}`;
}
