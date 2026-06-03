'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore, type Availability } from '@/store/ws';
import { useWebSocket } from '@/lib/useWebSocket';
import { api } from '@/lib/api';

const navItems = [
  { label: 'Conversations', href: '/dashboard', icon: (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 4h16v12H7l-3 4V4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )},
  { label: 'Contacts', href: '/contacts', icon: (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  )},
  { label: 'Reports', href: '/reports', icon: (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
    </svg>
  )},
  { label: 'Settings', href: '/settings/agents', icon: (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" />
    </svg>
  )},
];

const availabilityColors: Record<Availability, string> = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const availabilityLabels: Record<Availability, string> = {
  online: 'Online',
  busy: 'Busy',
  offline: 'Offline',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, accountId, accountName, clearAuth } = useAuthStore();
  const { sendPresence, presence } = useWsStore();
  const [showAvailability, setShowAvailability] = useState(false);

  useWebSocket();

  const myAvailability: Availability = (user ? (presence[user.id] ?? 'online') : 'offline') as Availability;

  useEffect(() => {
    if (!token) router.push('/sign-in');
  }, [token, router]);

  if (!user) return null;

  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M4 4h16v12H7l-3 4V4z" fill="white" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">
                Flow<span className="text-indigo-600">Chat</span>
              </span>
              {accountName && (
                <p className="text-xs text-gray-400 truncate max-w-[120px]">{accountName}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const active = item.href === '/settings/agents'
              ? isSettingsActive
              : pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 relative">
          {showAvailability && (
            <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10">
              {(['online', 'busy', 'offline'] as Availability[]).map((a) => (
                <button
                  key={a}
                  onClick={async () => {
                    sendPresence(a);
                    if (accountId && token) {
                      await api.agents.update(accountId, user.id, {}, token);
                    }
                    setShowAvailability(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${myAvailability === a ? 'font-medium text-gray-900' : 'text-gray-600'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${availabilityColors[a]}`} />
                  {availabilityLabels[a]}
                  {myAvailability === a && <span className="ml-auto text-indigo-500">✓</span>}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAvailability(!showAvailability)}
              className="relative shrink-0"
              title="Change availability"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${availabilityColors[myAvailability]}`} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{myAvailability}</p>
            </div>
            <button
              onClick={() => { clearAuth(); router.push('/sign-in'); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
