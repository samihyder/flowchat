'use client';

import { SettingsNav } from '@/components/layout/settings-nav';
import { PageHeader } from '@/components/ui/page-header';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader title="Settings" description="Manage your workspace, channels, and team" />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-gray-50/80">
        <SettingsNav />
        <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
