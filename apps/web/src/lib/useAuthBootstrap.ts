'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

async function backfillAccount() {
  const state = useAuthStore.getState();
  if (!state.token || state.accountId) return;

  try {
    const res = await api.auth.me(state.token);
    if (res.account) {
      state.setAccount(res.account.id, res.account.name);
      return;
    }
  } catch {
    // Railway API may be stale.
  }

  try {
    const res = await fetch('/api/workspace', {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { account?: { id: string; name: string } | null };
      if (data.account?.id) {
        state.setAccount(data.account.id, data.account.name);
      }
    }
  } catch {
    // Session invalid — layout will redirect to sign-in.
  }
}

/** Wait for persisted auth, then backfill accountId when missing from older sessions. */
export function useAuthBootstrap() {
  const { user, token, accountId } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      await backfillAccount();
      if (!cancelled) setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, user, token, accountId };
}
