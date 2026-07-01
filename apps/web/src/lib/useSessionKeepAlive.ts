'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { refreshSessionCookie } from '@/lib/session-cookie';
import { withBasePath } from '@/lib/base-path';

const PING_INTERVAL_MS = 10 * 60 * 1000;
const ACTIVITY_DEBOUNCE_MS = 5 * 60 * 1000;

/** Keep server + browser session alive while the tab is in use (24h sliding idle). */
export function useSessionKeepAlive() {
  const token = useAuthStore((s) => s.token);
  const lastActivityPing = useRef(0);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function ping() {
      try {
        const res = await fetch(withBasePath('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          refreshSessionCookie(token!);
        } else if (res.status === 401) {
          useAuthStore.getState().clearAuth();
        }
      } catch {
        /* transient network — keep local auth */
      }
    }

    void ping();
    const interval = setInterval(() => void ping(), PING_INTERVAL_MS);

    function onActivity() {
      const now = Date.now();
      if (now - lastActivityPing.current < ACTIVITY_DEBOUNCE_MS) return;
      lastActivityPing.current = now;
      void ping();
    }

    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [token]);
}
