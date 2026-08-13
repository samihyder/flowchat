'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'fc_pwa_prompt_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isMobileViewport(): boolean {
  return window.matchMedia?.('(max-width: 767px)').matches ?? false;
}

function isIos(): boolean {
  return /iP(hone|ad|od)/.test(window.navigator.userAgent);
}

/**
 * Prompts mobile users to install FlowChat as a PWA after they sign in.
 * Android/Chrome/Edge get a native install prompt via `beforeinstallprompt`;
 * iOS Safari (which never fires that event) gets manual "Add to Home
 * Screen" instructions instead. Shown once per dismissal — never nags on
 * every login.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    if (isStandalone() || !isMobileViewport()) return;

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] sm:hidden">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#06B6D4] flex items-center justify-center text-white font-bold text-base shrink-0">
          F
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install FlowChat</p>
          {showIosHint ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <span aria-hidden>􀈂</span> Share, then &ldquo;Add to Home Screen&rdquo; for quick access
              to chats and contacts.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Quick access to chats and contacts, right from your home screen.
            </p>
          )}
          <div className="flex gap-2 mt-2.5">
            {!showIosHint && (
              <button
                type="button"
                onClick={() => void install()}
                className="text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg px-3 py-1.5"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg px-3 py-1.5"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
