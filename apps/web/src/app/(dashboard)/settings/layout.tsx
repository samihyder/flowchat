'use client';

import { usePathname } from 'next/navigation';
import { SettingsNav } from '@/components/layout/settings-nav';
import { SettingsPageHeader } from '@/components/ui/settings-page';
import { SETTINGS_META } from '@/lib/settings-meta';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = SETTINGS_META[pathname] ?? { title: 'Settings', description: 'Workspace configuration' };

  return (
    <div className="settings-module flex flex-col h-full min-h-0 bg-gradient-to-b from-primary-50/80 via-slate-50 to-slate-100 animate-fade-in">
      <SettingsNav />
      <div className="flex-1 min-h-0 min-w-0 overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto sm:mx-0">
          <SettingsPageHeader title={meta.title} description={meta.description} />
          {children}
        </div>
      </div>
    </div>
  );
}
