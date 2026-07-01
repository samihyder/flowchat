'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { getSessionCookie, refreshSessionCookie } from '@/lib/session-cookie';
import { fetchWorkspace } from '@/lib/workspace';
import { withBasePath } from '@/lib/base-path';

function isValidUser(user: unknown): user is { id: string; name?: string | null; email: string } {
  if (!user || typeof user !== 'object') return false;
  const u = user as Record<string, unknown>;
  return typeof u.id === 'string' && typeof u.email === 'string';
}

function normalizeUser(user: { id: string; name?: string | null; email: string; avatarUrl?: string | null }) {
  const emailLocal = user.email.includes('@') ? user.email.split('@')[0] : user.email;
  return {
    id: user.id,
    email: user.email,
    name: user.name?.trim() || emailLocal || 'Agent',
    avatarUrl: user.avatarUrl,
  };
}

async function recoverFromCookie(cookieToken: string): Promise<'valid' | 'expired' | 'unknown'> {
  try {
    const res = await fetch(withBasePath('/api/auth/me'), {
      headers: { Authorization: `Bearer ${cookieToken}` },
    });
    if (res.status === 401) return 'expired';
    if (!res.ok) return 'unknown';

    const me = (await res.json()) as {
      user: { id: string; name?: string | null; email: string; avatarUrl?: string | null };
      account: { id: string; name: string } | null;
    };

    if (!isValidUser(me.user)) return 'unknown';

    let accountId = me.account?.id ?? null;
    let accountName = me.account?.name ?? '';

    if (!accountId) {
      const workspace = await fetchWorkspace(cookieToken);
      if (workspace && 'accountId' in workspace) {
        accountId = workspace.accountId;
        accountName = workspace.accountName;
      }
    }

    if (!accountId) return 'unknown';

    useAuthStore.getState().setAuth(normalizeUser(me.user), cookieToken, accountId, accountName);
    refreshSessionCookie(cookieToken);
    return 'valid';
  } catch {
    return 'unknown';
  }
}

/** Wait for persisted auth, recover from session cookie, and backfill workspace. */
export function useAuthBootstrap() {
  const { user, token, accountId } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (useAuthStore.persist?.hasHydrated && !useAuthStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }
      } catch {
        /* persist API unavailable — continue with current store state */
      }

      const state = useAuthStore.getState();

      if ((state.token && !isValidUser(state.user)) || (state.user && !state.token)) {
        state.clearAuth();
      } else if (state.user && isValidUser(state.user) && !state.user.name?.trim()) {
        useAuthStore.setState({ user: normalizeUser(state.user) });
      }

      let activeToken = useAuthStore.getState().token;
      const cookieToken = getSessionCookie();

      if (!activeToken && cookieToken) {
        const recovery = await recoverFromCookie(cookieToken);
        if (recovery === 'valid') {
          activeToken = cookieToken;
        } else if (recovery === 'expired') {
          useAuthStore.getState().clearAuth();
        }
      } else if (activeToken) {
        refreshSessionCookie(activeToken);
      }

      if (activeToken && !useAuthStore.getState().accountId) {
        const workspace = await fetchWorkspace(activeToken);
        if (workspace && 'accountId' in workspace) {
          useAuthStore.getState().setAccount(workspace.accountId, workspace.accountName);
        }
      }

      if (!cancelled) setReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, user, token, accountId };
}
