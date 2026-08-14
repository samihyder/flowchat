'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { Contact } from '@/lib/api';
import { countryLabel } from '@/lib/country';
import { contactTypeBadgeClass, formatRelativeTime, initialsFromName } from '@/lib/format';
import { MarketingStatusBadge } from '@/components/contacts/marketing-status-badge';

export function ContactListItem({
  contact,
  bulkSelected,
  onBulkToggle,
}: {
  contact: Contact;
  bulkSelected?: boolean;
  onBulkToggle?: () => void;
}) {
  return (
    <div className="flex items-stretch border-b border-gray-100 transition-colors hover:bg-gray-50">
      {onBulkToggle && (
        <label className="flex items-center px-3 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={bulkSelected}
            onChange={onBulkToggle}
            className="rounded border-gray-300 text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500/40"
          />
        </label>
      )}
      <Link
        href={`/dashboard/contacts/${contact.id}` as Route}
        className="flex-1 text-left px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 min-w-0 active:scale-[0.99] transition-transform"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 ring-1 ring-primary-900/5">
          {initialsFromName(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate text-gray-900">{contact.name}</span>
            <span
              className={`shrink-0 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${contactTypeBadgeClass(contact.type)}`}
            >
              {contact.type}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{contact.email ?? 'No email'}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <MarketingStatusBadge status={contact.marketingStatus} />
            {contact.labels && contact.labels.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {contact.labels.slice(0, 2).map((l) => (
                  <span
                    key={l.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
                {contact.labels.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{contact.labels.length - 2}</span>
                )}
              </span>
            )}
            {contact.activeAutomation ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">
                ⚡ {contact.activeAutomation.name} · {contact.activeAutomation.currentStep}/{contact.activeAutomation.totalSteps}
              </span>
            ) : (
              <span className="hidden sm:inline text-[10px] text-gray-400">— no automation</span>
            )}
            {contact.country && (
              <span className="hidden sm:inline text-[10px] text-gray-500">{countryLabel(contact.country)}</span>
            )}
            <span className="text-[10px] text-gray-400">{formatRelativeTime(contact.lastActivityAt)}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
