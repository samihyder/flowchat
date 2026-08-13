'use client';

import { useEffect } from 'react';
import { withBasePath } from '@/lib/base-path';
import { detectAndPersistPwaMode } from '@/lib/use-pwa-mode';

/**
 * Mounted once at the root layout. Registers the minimal installability-only
 * service worker and detects standalone/PWA launch mode on every page load.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    detectAndPersistPwaMode();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(withBasePath('/sw.js')).catch(() => {});
    }
  }, []);
  return null;
}
