'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore, type Availability } from '@/store/ws';
import { useWebSocket } from '@/lib/useWebSocket';
import { useVisitorAlarm } from '@/lib/useVisitorAlarm';
import { useMessageAlert } from '@/lib/useMessageAlert';
import { isMessageAlertMuted, setMessageAlertMuted } from '@/lib/message-alert';
import { useAuthBootstrap } from '@/lib/useAuthBootstrap';
import { api } from '@/lib/api';
import { countryLabel } from '@/lib/country';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

type Inbox = { id: string; name: string; channelType: string; widgetColor: string | null };
type Team = { id: string; name: string };

const availabilityColors: Record<Availability, string> = {
  online: 'bg-accent-500',
  busy: 'bg-amber-400',
  offline: 'bg-gray-400',
};

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
  const searchParams = useSearchParams();
  const conversationFilter = searchParams.get('filter');
  const { user, token, accountId, accountName, clearAuth } = useAuthStore();
  const { ready: authReady } = useAuthBootstrap();
  const { sendPresence, presence, lastMissedChatEvent, clearMissedChatEvent } = useWsStore();
  const [showAvailability, setShowAvailability] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [messageMuted, setMessageMuted] = useState(true);
  const [unreadAll, setUnreadAll] = useState(0);
  const [unreadMine, setUnreadMine] = useState(0);
  const [unreadUnassigned, setUnreadUnassigned] = useState(0);
  const [unreadByInbox, setUnreadByInbox] = useState<Record<string, number>>({});

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
    if (!token) {
      router.push('/sign-in');
      return;
    }
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
    if (!token || !accountId || !user) return;
    const refreshUnread = () => {
      api.conversations
        .list(accountId, token, { status: 'open' })
        .then((r) => {
          const convs = r.conversations;
          setUnreadAll(convs.reduce((n, c) => n + (Number(c.unreadCount) || 0), 0));
          setUnreadMine(
            convs
              .filter((c) => c.assigneeId === user.id)
              .reduce((n, c) => n + (Number(c.unreadCount) || 0), 0)
          );
          setUnreadUnassigned(
            convs
              .filter((c) => !c.assigneeId)
              .reduce((n, c) => n + (Number(c.unreadCount) || 0), 0)
          );
          const byInbox: Record<string, number> = {};
          for (const c of convs) {
            byInbox[c.inboxId] = (byInbox[c.inboxId] ?? 0) + (Number(c.unreadCount) || 0);
          }
          setUnreadByInbox(byInbox);
        })
        .catch(() => {});
    };
    refreshUnread();
    const interval = setInterval(refreshUnread, 30_000);
    return () => clearInterval(interval);
  }, [token, accountId, user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!authReady || !user?.id) {
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

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[220px] bg-sidebar-bg flex flex-col shrink-0 transform transition-transform duration-200 relative ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <DashboardSidebar
          accountName={accountName ?? undefined}
          userName={user.name || user.email || 'Agent'}
          myAvailability={myAvailability}
          inboxes={inboxes}
          teams={teams}
          conversationFilter={conversationFilter}
          unreadAll={unreadAll}
          unreadMine={unreadMine}
          unreadUnassigned={unreadUnassigned}
          unreadByInbox={unreadByInbox}
          onAvailabilityClick={() => setShowAvailability(!showAvailability)}
          onSignOut={() => {
            clearAuth();
            router.push('/sign-in');
          }}
          messageMuted={messageMuted}
          onToggleMessageMute={() => {
            const next = !messageMuted;
            setMessageAlertMuted(next);
            setMessageMuted(next);
          }}
        />

        {showAvailability && (
          <div className="absolute bottom-16 left-3 right-3 bg-sidebar-hover border border-sidebar-muted/30 rounded-lg shadow-lg py-1 z-10">
            {(['online', 'busy', 'offline'] as Availability[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  sendPresence(a);
                  setShowAvailability(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  myAvailability === a ? 'font-medium text-white' : 'text-sidebar-text hover:bg-sidebar-bg'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${availabilityColors[a]}`} />
                <span className="capitalize">{a}</span>
              </button>
            ))}
          </div>
        )}
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
              {visitorAlert.countryCode
                ? ` · ${countryLabel(visitorAlert.countryCode) ?? visitorAlert.countryCode}`
                : ''}
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
          <p className="text-sm font-semibold text-gray-900">FlowChat</p>
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
