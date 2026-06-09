'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsNav = [
  { label: 'Account', href: '/settings/account' },
  { label: 'Inboxes', href: '/settings/inboxes' },
  { label: 'Agents', href: '/settings/agents' },
  { label: 'Teams', href: '/settings/teams' },
  { label: 'Security', href: '/settings/security' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav className="w-48 bg-white border-r border-gray-200 p-3 space-y-0.5 shrink-0">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
