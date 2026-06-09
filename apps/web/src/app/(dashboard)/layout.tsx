'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore, type Availability } from '@/store/ws';
import { useWebSocket } from '@/lib/useWebSocket';
import { api } from '@/lib/api';

type Inbox = { id: string; name: string; channelType: string; widgetColor: string | null };
type Team = { id: string; name: string };

const availabilityColors: Record<Availability, string> = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const conversationLinks: { label: string; href: Route; count: number }[] = [
  { label: 'All', href: '/dashboard', count: 0 },
  { label: 'Mine', href: '/dashboard?filter=mine' as Route, count: 0 },
];

const channelIcons: Record<string, string> = {
  web_widget: '💬',
  email: '✉️',
  whatsapp: '📱',
  facebook: '📘',
  instagram: '📸',
  telegram: '✈️',
  sms: '📨',
  api: '🔌',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, accountId, accountName, clearAuth } = useAuthStore();
  const { sendPresence, presence } = useWsStore();
  const [showAvailability, setShowAvailability] = useState(false);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useWebSocket();

  useEffect(() => {
    if (!token) { router.push('/sign-in'); return; }
    if (!accountId) return;
    Promise.all([
      api.inboxes.list(accountId, token).then((r) => setInboxes(r.inboxes)).catch(() => {}),
      api.teams.list(accountId, token).then((r) => setTeams(r.teams)).catch(() => {}),
    ]);
  }, [token, accountId, router]);

  if (!user) return null;

  const myAvailability: Availability = (presence[user.id] ?? 'online') as Availability;
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M4 4h16v12H7l-3 4V4z" fill="white" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">
                Flow<span className="text-indigo-600">Chat</span>
              </p>
              {accountName && (
                <p className="text-xs text-gray-400 truncate">{accountName}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Conversations */}
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Conversations
            </div>
            <div className="space-y-0.5 mt-1">
              {conversationLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/dashboard' && !item.href.includes('?filter')
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Inboxes */}
          <div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Inboxes</span>
              <Link
                href="/settings/inboxes"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Manage inboxes"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
            <div className="space-y-0.5 mt-1">
              {inboxes.length === 0 ? (
                <Link
                  href="/settings/inboxes"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  + Create first inbox
                </Link>
              ) : (
                inboxes.map((inbox) => (
                  <Link
                    key={inbox.id}
                    href={`/dashboard?inbox=${inbox.id}` as Route}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">{channelIcons[inbox.channelType] ?? '💬'}</span>
                      <span className="truncate">{inbox.name}</span>
                    </div>
                    <span className="text-xs text-gray-300 group-hover:text-gray-400">0</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Teams
              </div>
              <div className="space-y-0.5 mt-1">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/dashboard?team=${team.id}` as Route}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">👥</span>
                      <span className="truncate">{team.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bottom nav */}
          <div className="pt-2 border-t border-gray-100 space-y-0.5">
            <Link
              href="/settings/agents"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSettingsActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </Link>
          </div>
        </nav>

        {/* Agent footer */}
        <div className="p-3 border-t border-gray-200 relative">
          {showAvailability && (
            <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10">
              {(['online', 'busy', 'offline'] as Availability[]).map((a) => (
                <button
                  key={a}
                  onClick={() => { sendPresence(a); setShowAvailability(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    myAvailability === a ? 'font-medium text-gray-900' : 'text-gray-600'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${availabilityColors[a]}`} />
                  <span className="capitalize">{a}</span>
                  {myAvailability === a && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
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
