'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { ensureWorkspace } from '@/lib/workspace';

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

      await ensureWorkspace();
      if (!cancelled) setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, user, token, accountId };
}
