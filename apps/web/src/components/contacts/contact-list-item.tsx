'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { Contact } from '@/lib/api';
import { countryLabel } from '@/lib/country';
import { contactTypeBadgeClass, formatRelativeTime, initialsFromName } from '@/lib/format';
import { MarketingStatusBadge } from '@/components/contacts/marketing-status-badge';

export function ContactListItem({
  contact,
  active,
  onActivate,
  bulkSelected,
  onBulkToggle,
}: {
  contact: Contact;
  active: boolean;
  onActivate: () => void;
  bulkSelected?: boolean;
  onBulkToggle?: () => void;
}) {
  return (
    <div
      className={`flex items-stretch border-b border-gray-100 transition-colors ${
        active ? 'bg-primary-50/80' : 'hover:bg-gray-50'
      }`}
    >
      {onBulkToggle && (
        <label className="flex items-center px-3 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={bulkSelected}
            onChange={(e) => {
              e.stopPropagation();
              onBulkToggle();
            }}
            className="rounded border-gray-300"
          />
        </label>
      )}
      <button type="button" onClick={onActivate} className="flex-1 text-left px-4 py-3 flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            active ? 'bg-primary-500 text-white shadow-sm' : 'bg-primary-100 text-primary-700'
          }`}
        >
          {initialsFromName(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/contacts/${contact.id}` as Route}
              onClick={(e) => e.stopPropagation()}
              className={`font-medium truncate hover:text-primary-600 ${active ? 'text-primary-900' : 'text-gray-900'}`}
            >
              {contact.name}
            </Link>
            <span
              className={`shrink-0 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${contactTypeBadgeClass(contact.type)}`}
            >
              {contact.type}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{contact.email ?? 'No email'}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <MarketingStatusBadge status={contact.marketingStatus} />
            {contact.country && (
              <span className="text-[10px] text-gray-500">{countryLabel(contact.country)}</span>
            )}
            <span className="text-[10px] text-gray-400">{formatRelativeTime(contact.lastActivityAt)}</span>
          </div>
        </div>
        {active && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 shrink-0">
            Active
          </span>
        )}
      </button>
    </div>
  );
}
