'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Route } from 'next';
import { useAuthStore } from '@/store/auth';
import { useAuthBootstrap } from '@/lib/useAuthBootstrap';
import { useSessionKeepAlive } from '@/lib/useSessionKeepAlive';
import { MarketingSidebar } from '@/components/layout/marketing-sidebar';

function MarketingShellFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-10 h-10 rounded-xl bg-primary animate-pulse" />
    </div>
  );
}

function MarketingShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, accountId } = useAuthStore();
  const { ready: authReady } = useAuthBootstrap();
  useSessionKeepAlive();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isWizard = pathname.includes('/edit');

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push('/sign-in' as Route);
      return;
    }
    if (!accountId) {
      router.push('/dashboard' as Route);
    }
  }, [authReady, token, accountId, router]);

  if (!authReady || !user?.id) {
    return <MarketingShellFallback />;
  }

  return (
    <div className="marketing-module min-h-screen bg-surface text-on-surface">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <MarketingSidebar
          variant={isWizard ? 'wizard' : 'list'}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex flex-col min-h-screen min-w-0 lg:ml-64">
        {!isWizard && (
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface border-b border-gray-200 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-on-surface-variant"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <p className="text-headline-sm font-bold text-primary">FlowChat</p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<MarketingShellFallback />}>
      <MarketingShellInner>{children}</MarketingShellInner>
    </Suspense>
  );
}
