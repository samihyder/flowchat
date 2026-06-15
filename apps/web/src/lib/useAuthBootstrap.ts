'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { getSessionCookie } from '@/lib/session-cookie';
import { fetchWorkspace } from '@/lib/workspace';
import { api } from '@/lib/api';

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

      // Drop corrupted persisted auth (e.g. partial localStorage after schema changes).
      if ((state.token && !isValidUser(state.user)) || (state.user && !state.token)) {
        state.clearAuth();
      } else if (state.user && isValidUser(state.user) && !state.user.name?.trim()) {
        useAuthStore.setState({ user: normalizeUser(state.user) });
      }

      let activeToken = useAuthStore.getState().token;
      const cookieToken = getSessionCookie();

      if (!activeToken && cookieToken) {
        try {
          const me = await api.auth.me(cookieToken);
          if (isValidUser(me.user) && me.account?.id) {
            useAuthStore.getState().setAuth(
              normalizeUser(me.user),
              cookieToken,
              me.account.id,
              me.account.name
            );
            activeToken = cookieToken;
          } else {
            const workspace = await fetchWorkspace(cookieToken);
            if (workspace && 'accountId' in workspace && isValidUser(me.user)) {
              useAuthStore.getState().setAuth(
                normalizeUser(me.user),
                cookieToken,
                workspace.accountId,
                workspace.accountName
              );
              activeToken = cookieToken;
            }
          }
        } catch {
          useAuthStore.getState().clearAuth();
        }
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
