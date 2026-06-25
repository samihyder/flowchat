'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import type { Availability } from '@/store/ws';
import { initials } from '@/components/conversations/conversation-badges';

type Inbox = { id: string; name: string; channelType: string; widgetColor: string | null };
type Team = { id: string; name: string };

const availabilityColors: Record<Availability, string> = {
  online: 'bg-accent-500',
  busy: 'bg-amber-400',
  offline: 'bg-gray-400',
};

function NavItem({
  href,
  active,
  icon,
  label,
  badge,
  badgeRed,
}: {
  href: Route | string;
  active?: boolean;
  icon: string;
  label: string;
  badge?: number;
  badgeRed?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      className={`flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-sidebar-hover text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
      }`}
    >
      <span className="w-4 text-center text-sm opacity-80">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            badgeRed ? 'bg-red-500 text-white' : 'bg-primary-500 text-white'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-3 pb-1">
      <div className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-label">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function DashboardSidebar({
  accountName,
  userName,
  userRole,
  myAvailability,
  inboxes,
  teams,
  conversationFilter,
  unreadAll = 0,
  unreadMine = 0,
  unreadUnassigned = 0,
  unreadByInbox = {},
  onAvailabilityClick,
  onSignOut,
  messageMuted,
  onToggleMessageMute,
}: {
  accountName?: string;
  userName: string;
  userRole?: string;
  myAvailability: Availability;
  inboxes: Inbox[];
  teams: Team[];
  conversationFilter: string | null;
  unreadAll?: number;
  unreadMine?: number;
  unreadUnassigned?: number;
  unreadByInbox?: Record<string, number>;
  onAvailabilityClick: () => void;
  onSignOut: () => void;
  messageMuted: boolean;
  onToggleMessageMute: () => void;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';
  const isMarketing =
    pathname.startsWith('/marketing') || pathname.startsWith('/settings/email-marketing');

  return (
    <>
      <div className="px-4 py-4 border-b border-sidebar-hover flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          F
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-[15px] leading-tight">FlowChat</p>
          {accountName && (
            <p className="text-[11px] text-sidebar-muted truncate">{accountName}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <NavSection label="Conversations">
          <NavItem
            href="/dashboard"
            active={isDashboard && !conversationFilter}
            icon="💬"
            label="All conversations"
            badge={unreadAll}
          />
          <NavItem
            href="/dashboard?filter=mine"
            active={isDashboard && conversationFilter === 'mine'}
            icon="👤"
            label="Mine"
            badge={unreadMine}
          />
          <NavItem
            href="/dashboard?filter=unassigned"
            active={isDashboard && conversationFilter === 'unassigned'}
            icon="📥"
            label="Unassigned"
            badge={unreadUnassigned}
            badgeRed
          />
        </NavSection>

        <NavSection label="Inboxes">
          {inboxes.length === 0 ? (
            <NavItem href="/settings/inboxes" icon="➕" label="Create inbox" />
          ) : (
            inboxes.map((inbox) => (
              <NavItem
                key={inbox.id}
                href={`/dashboard?inbox=${inbox.id}`}
                active={isDashboard && false}
                icon="🌐"
                label={inbox.name}
                badge={unreadByInbox[inbox.id]}
              />
            ))
          )}
        </NavSection>

        {teams.length > 0 && (
          <NavSection label="Teams">
            {teams.map((team) => (
              <NavItem
                key={team.id}
                href={`/dashboard?team=${team.id}`}
                icon="👥"
                label={team.name}
              />
            ))}
          </NavSection>
        )}

        <NavSection label="CRM">
          <NavItem
            href="/dashboard/contacts"
            active={pathname.startsWith('/dashboard/contacts')}
            icon="🧑‍💼"
            label="Contacts"
          />
          <NavItem
            href="/marketing/campaigns"
            active={isMarketing}
            icon="📧"
            label="Marketing"
          />
        </NavSection>

        <NavSection label="Insights">
          <NavItem
            href="/dashboard/analytics"
            active={pathname === '/dashboard/analytics'}
            icon="📊"
            label="Analytics"
          />
        </NavSection>

        <NavSection label="Workspace">
          <NavItem
            href="/settings/account"
            active={pathname.startsWith('/settings')}
            icon="⚙️"
            label="Settings"
          />
        </NavSection>
      </nav>

      <div className="p-3 border-t border-sidebar-hover">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onAvailabilityClick}
            className="relative shrink-0"
            title="Change availability"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
              {initials(userName)}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar-bg ${availabilityColors[myAvailability]}`}
            />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-text truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-muted capitalize truncate">
              {userRole ?? myAvailability}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMessageMute}
            className="text-sidebar-muted hover:text-white p-1 text-sm"
            title={messageMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {messageMuted ? '🔕' : '🔔'}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="text-sidebar-muted hover:text-white p-1"
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
}
