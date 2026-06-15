'use client';

import { usePathname } from 'next/navigation';
import { SettingsNav } from '@/components/layout/settings-nav';
import { SettingsPageHeader } from '@/components/ui/settings-page';
import { SETTINGS_META } from '@/lib/settings-meta';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = SETTINGS_META[pathname] ?? { title: 'Settings', description: 'Workspace configuration' };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <header className="h-14 bg-white border-b border-gray-200 px-5 flex items-center shrink-0">
        <div>
          <p className="text-base font-semibold text-gray-900">Settings</p>
          <p className="text-xs text-gray-500">{meta.title}</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-gray-50">
        <SettingsNav />
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-3xl">
            <SettingsPageHeader title={meta.title} description={meta.description} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
