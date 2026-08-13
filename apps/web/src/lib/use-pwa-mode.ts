'use client';

import { useEffect, useState } from 'react';

const COOKIE_NAME = 'fc_pwa';

function readPwaCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${COOKIE_NAME}=1`);
}

/**
 * Detects a standalone/installed PWA launch (Android/desktop `display-mode`,
 * iOS `navigator.standalone`, or the `?source=pwa` query param carried by
 * the manifest's start_url) and persists it in a plain cookie so
 * `middleware.ts` can also restrict server-rendered navigation to
 * Chat + Contacts. Safe to call on every page load — a no-op once the
 * cookie is already set for a non-PWA browser tab.
 */
export function detectAndPersistPwaMode() {
  if (typeof window === 'undefined') return;
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    new URLSearchParams(window.location.search).get('source') === 'pwa';
  if (isStandalone) {
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=31536000; samesite=lax`;
  }
}

/** Reactive read of PWA mode for client UI (e.g. hiding nav sections). */
export function usePwaMode(): boolean {
  const [pwa, setPwa] = useState(false);
  useEffect(() => {
    detectAndPersistPwaMode();
    setPwa(readPwaCookie());
  }, []);
  return pwa;
}
