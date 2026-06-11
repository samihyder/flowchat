'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore, type Availability } from '@/store/ws';
import { useWebSocket } from '@/lib/useWebSocket';
import { useVisitorAlarm } from '@/lib/useVisitorAlarm';
import { useMessageAlert } from '@/lib/useMessageAlert';
import { isMessageAlertMuted, setMessageAlertMuted } from '@/lib/message-alert';
import { useAuthBootstrap } from '@/lib/useAuthBootstrap';
import { api } from '@/lib/api';

type Inbox = { id: string; name: string; channelType: string; widgetColor: string | null };
type Team = { id: string; name: string };

const availabilityColors: Record<Availability, string> = {
  online: 'bg-accent-500',
  busy: 'bg-amber-400',
  offline: 'bg-gray-300',
};

const channelIcons: Record<string, string> = {
  web_widget: '💬',
  email: '✉️',
  whatsapp: '📱',
  api: '🔌',
};

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-0.5 mt-1">{children}</div>
    </div>
  );
}

function DashboardShellFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 animate-pulse" />
        <p className="text-sm text-gray-500">Loading workspace…</p>
      </div>
    </div>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, accountId, accountName, clearAuth } = useAuthStore();
  const { ready: authReady } = useAuthBootstrap();
  const { sendPresence, presence, lastMissedChatEvent, missedChatEventSeq, clearMissedChatEvent } =
    useWsStore();
  const [showAvailability, setShowAvailability] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [messageMuted, setMessageMuted] = useState(true);

  useWebSocket();
  const { alert: visitorAlert, muted: alarmMuted, toggleMute: toggleAlarm } = useVisitorAlarm();
  useMessageAlert();

  useEffect(() => {
    setMessageMuted(isMessageAlertMuted());
  }, []);

  useEffect(() => {
    if (!token || !accountId) return;
    const run = () => {
      fetch(`/api/accounts/${accountId}/missed-chats`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    };
    run();
    const interval = setInterval(run, 60_000);
    return () => clearInterval(interval);
  }, [token, accountId]);

  useEffect(() => {
    if (!authReady) return;
    if (!token) { router.push('/sign-in'); return; }
    if (!accountId) {
      fetch('/api/workspace', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data: { pendingApproval?: boolean }) => {
          if (data.pendingApproval) router.push('/pending-approval' as Route);
        })
        .catch(() => {});
      return;
    }
    Promise.all([
      api.inboxes.list(accountId, token).then((r) => setInboxes(r.inboxes)).catch(() => {}),
      api.teams.list(accountId, token).then((r) => setTeams(r.teams)).catch(() => {}),
    ]);
  }, [authReady, token, accountId, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 animate-pulse" />
          <p className="text-sm text-gray-500">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const myAvailability: Availability = (presence[user.id] ?? 'online') as Availability;
  const isSettingsActive = pathname.startsWith('/settings');

  const sidebar = (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M4 4h16v12H7l-3 4V4z" fill="white" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">
              Flow<span className="text-primary-500">Chat</span>
            </p>
            {accountName && (
              <p className="text-xs text-gray-400 truncate">{accountName}</p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        <NavSection title="Conversations">
          <Link
            href={'/dashboard' as Route}
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Conversations
          </Link>
          <Link
            href={'/dashboard/analytics' as Route}
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard/analytics'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Analytics
          </Link>
        </NavSection>

        <NavSection title="Inboxes">
          {inboxes.length === 0 ? (
            <Link
              href="/settings/inboxes"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary-600 hover:bg-primary-50 transition-colors"
            >
              + Create first inbox
            </Link>
          ) : (
            inboxes.map((inbox) => (
              <Link
                key={inbox.id}
                href={`/dashboard?inbox=${inbox.id}` as Route}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: inbox.widgetColor ?? '#6366F1' }}
                />
                <span className="truncate">{inbox.name}</span>
              </Link>
            ))
          )}
        </NavSection>

        {teams.length > 0 && (
          <NavSection title="Teams">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/dashboard?team=${team.id}` as Route}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="truncate">{team.name}</span>
              </Link>
            ))}
          </NavSection>
        )}

        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/settings/agents"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSettingsActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Settings
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200 relative">
        {showAvailability && (
          <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10">
            {(['online', 'busy', 'offline'] as Availability[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => { sendPresence(a); setShowAvailability(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  myAvailability === a ? 'font-medium text-gray-900' : 'text-gray-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${availabilityColors[a]}`} />
                <span className="capitalize">{a}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAvailability(!showAvailability)}
            className="relative shrink-0"
            title="Change availability"
          >
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${availabilityColors[myAvailability]}`} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{myAvailability}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !messageMuted;
              setMessageAlertMuted(next);
              setMessageMuted(next);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title={messageMuted ? 'Unmute message sounds' : 'Mute message sounds'}
          >
            {messageMuted ? '🔕' : '🔔'}
          </button>
          <button
            type="button"
            onClick={() => { clearAuth(); router.push('/sign-in'); }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebar}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {lastMissedChatEvent && (
          <div className="bg-red-600 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3 shrink-0">
            <span>
              Missed chat: {lastMissedChatEvent.contactName} on {lastMissedChatEvent.inboxName} (
              {lastMissedChatEvent.minutesWaiting}m waiting)
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/dashboard?conversation=${lastMissedChatEvent.conversationId}` as Route}
                className="text-xs underline"
                onClick={() => clearMissedChatEvent()}
              >
                Open
              </Link>
              <button type="button" onClick={() => clearMissedChatEvent()} className="text-xs underline">
                Dismiss
              </button>
            </div>
          </div>
        )}
        {visitorAlert && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3 shrink-0 animate-pulse">
            <span>
              Visitor on {visitorAlert.inboxName}
              {visitorAlert.ipAddress ? ` · ${visitorAlert.ipAddress}` : ''}
            </span>
            <button
              type="button"
              onClick={toggleAlarm}
              className="text-xs underline opacity-90 shrink-0"
            >
              {alarmMuted ? 'Unmute alarm' : 'Mute alarm'}
            </button>
          </div>
        )}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-gray-900">
            Flow<span className="text-primary-500">Chat</span>
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
