import { getBasePath } from '@/lib/base-path';
import { SESSION_IDLE_SECONDS } from '@/lib/session-policy';

const COOKIE_NAME = 'fc_session';

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
  const path = sessionCookiePath();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=${path}; max-age=${SESSION_IDLE_SECONDS}; SameSite=Lax`;
}

/** Reset browser cookie idle timer after server session touch. */
export function refreshSessionCookie(token: string) {
  setSessionCookie(token);
}

export function clearSessionCookie() {
  const path = sessionCookiePath();
  document.cookie = `${COOKIE_NAME}=; path=${path}; max-age=0; SameSite=Lax`;
}
