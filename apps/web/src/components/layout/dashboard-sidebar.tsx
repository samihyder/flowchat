'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import type { Availability } from '@/store/ws';
import { initials } from '@/components/conversations/conversation-badges';
import { useAuthStore } from '@/store/auth';
import { EcosystemNavItem } from '@/components/layout/ecosystem-nav-item';
import { useRestrictedNav } from '@/lib/use-pwa-mode';

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
      className={`group flex items-center gap-2.5 mx-2 px-3 py-2.5 sm:py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
        active
          ? 'bg-primary-500 text-white shadow-sm shadow-primary-900/30'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white active:scale-[0.98]'
      }`}
    >
      <span className="material-symbols-outlined text-[18px] w-5 text-center opacity-90 group-hover:opacity-100 shrink-0">
        {icon}
      </span>
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            badgeRed ? 'bg-red-500 text-white' : active ? 'bg-white/25 text-white' : 'bg-primary-500 text-white'
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
  const router = useRouter();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const navRestricted = useRestrictedNav();
  const isDashboard = pathname === '/dashboard';
  const isMarketing =
    pathname.startsWith('/marketing') || pathname.startsWith('/settings/email-marketing');

  return (
    <>
      <div className="px-4 py-4 border-b border-sidebar-hover flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2DD4BF] to-[#06B6D4] flex items-center justify-center text-white font-bold text-sm shrink-0">
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
            icon="chat"
            label="All conversations"
            badge={unreadAll}
          />
          <NavItem
            href="/dashboard?filter=mine"
            active={isDashboard && conversationFilter === 'mine'}
            icon="person"
            label="Mine"
            badge={unreadMine}
          />
          <NavItem
            href="/dashboard?filter=unassigned"
            active={isDashboard && conversationFilter === 'unassigned'}
            icon="inbox"
            label="Unassigned"
            badge={unreadUnassigned}
            badgeRed
          />
        </NavSection>

        {!navRestricted && (
          <NavSection label="Inboxes">
            {inboxes.length === 0 ? (
              <NavItem href="/settings/inboxes" icon="add" label="Create inbox" />
            ) : (
              inboxes.map((inbox) => (
                <NavItem
                  key={inbox.id}
                  href={`/dashboard?inbox=${inbox.id}`}
                  active={isDashboard && false}
                  icon="language"
                  label={inbox.name}
                  badge={unreadByInbox[inbox.id]}
                />
              ))
            )}
          </NavSection>
        )}

        {!navRestricted && teams.length > 0 && (
          <NavSection label="Teams">
            {teams.map((team) => (
              <NavItem
                key={team.id}
                href={`/dashboard?team=${team.id}`}
                icon="group"
                label={team.name}
              />
            ))}
          </NavSection>
        )}

        <NavSection label="CRM">
          <NavItem
            href="/dashboard/contacts"
            active={pathname.startsWith('/dashboard/contacts')}
            icon="contacts"
            label="Contacts"
          />
          {!navRestricted && (
            <>
              <NavItem
                href="/dashboard/documents"
                active={pathname.startsWith('/dashboard/documents')}
                icon="description"
                label="Documents"
              />
              <NavItem
                href="/dashboard/channel-campaigns"
                active={pathname.startsWith('/dashboard/channel-campaigns')}
                icon="campaign"
                label="Channel campaigns"
              />
              <NavItem
                href="/marketing/campaigns"
                active={isMarketing}
                icon="mail"
                label="Marketing"
              />
            </>
          )}
        </NavSection>

        {!navRestricted && (
          <NavSection label="Ecosystem">
            <NavItem
              href="/settings/leadsnapper"
              active={pathname.startsWith('/settings/leadsnapper')}
              icon="travel_explore"
              label="LeadSnapper"
            />
            <EcosystemNavItem
              target="wa-automation"
              icon="chat"
              label="WhatsApp CRM"
              path="/wa-automation/inbox"
            />
            <EcosystemNavItem
              target="lead-monitor"
              icon="sensors"
              label="Lead Monitor"
              path="/lead-monitor/leads"
            />
          </NavSection>
        )}

        {!navRestricted && (
          <NavSection label="Insights">
            <NavItem
              href="/dashboard/analytics"
              active={pathname === '/dashboard/analytics'}
              icon="bar_chart"
              label="Analytics"
            />
            <NavItem
              href="/dashboard/reports"
              active={pathname === '/dashboard/reports'}
              icon="trending_up"
              label="Reports"
            />
          </NavSection>
        )}

        {!navRestricted && (
          <NavSection label="Workspace">
            <NavItem
              href="/settings/account"
              active={pathname.startsWith('/settings')}
              icon="settings"
              label="Settings"
            />
          </NavSection>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-hover">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onAvailabilityClick}
            className="relative shrink-0 p-1 -m-1"
            title="Change availability"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold">
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
            className="text-sidebar-muted hover:text-white hover:bg-sidebar-hover rounded-lg p-2.5 -m-1 transition-colors"
            title={messageMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            <span className="material-symbols-outlined text-[18px] block">
              {messageMuted ? 'notifications_off' : 'notifications'}
            </span>
          </button>
          {navRestricted && (
            <button
              type="button"
              onClick={() => router.push('/settings/notifications' as Route)}
              className="text-sidebar-muted hover:text-white hover:bg-sidebar-hover rounded-lg p-2.5 -m-1 transition-colors"
              title="Notification sound settings"
            >
              <span className="material-symbols-outlined text-[18px] block">tune</span>
            </button>
          )}
          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => router.push('/select-workspace' as Route)}
                className="text-sidebar-muted hover:text-white hover:bg-sidebar-hover rounded-lg p-2.5 -m-1 transition-colors"
                title="Switch workspace"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M8 7h12m0 0-4-4m4 4-4 4M16 17H4m0 0 4 4m-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/api-catalog' as Route)}
                className="text-sidebar-muted hover:text-white hover:bg-sidebar-hover rounded-lg p-2.5 -m-1 transition-colors"
                title="API Catalog"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="text-sidebar-muted hover:text-white hover:bg-sidebar-hover rounded-lg p-2.5 -m-1 transition-colors"
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
