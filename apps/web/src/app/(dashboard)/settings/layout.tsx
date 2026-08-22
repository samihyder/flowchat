'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SettingsNav } from '@/components/layout/settings-nav';
import { SettingsPageHeader } from '@/components/ui/settings-page';
import { SETTINGS_META } from '@/lib/settings-meta';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = SETTINGS_META[pathname] ?? { title: 'Settings', description: 'Workspace configuration' };
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="settings-module flex h-full min-h-0 bg-gradient-to-b from-primary-50/80 via-slate-50 to-slate-100 animate-fade-in">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-label="Close settings menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shrink-0 transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <SettingsNav onNavigate={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <div className="lg:hidden shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -m-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Open settings menu"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm font-bold text-gray-900">{meta.title}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto sm:mx-0">
            <SettingsPageHeader title={meta.title} description={meta.description} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
