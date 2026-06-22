import { getBasePath } from '@/lib/base-path';

const COOKIE_NAME = 'fc_session';
const MAX_AGE_DAYS = 30;

function sessionCookiePath(): string {
  return getBasePath() || '/';
}

export function getSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const path = sessionCookiePath();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=${path}; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie() {
  const path = sessionCookiePath();
  document.cookie = `${COOKIE_NAME}=; path=${path}; max-age=0; SameSite=Lax`;
}
