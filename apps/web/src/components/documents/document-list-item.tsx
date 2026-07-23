'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { DasDocument } from '@/lib/api';
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from '@/components/documents/document-badges';
import { formatRelativeTime, initialsFromName } from '@/lib/format';

const STATUS_ACCENT: Record<string, string> = {
  draft: 'bg-slate-300',
  pending_approval: 'bg-amber-400',
  approved: 'bg-primary-500',
  rejected: 'bg-rose-400',
  finalized: 'bg-emerald-500',
  archived: 'bg-slate-400',
};

export function DocumentListItem({ document }: { document: DasDocument }) {
  const accent = STATUS_ACCENT[document.status] ?? 'bg-slate-300';

  return (
    <div className="group flex items-stretch border-b border-primary-100/60 bg-white/80 transition-colors hover:bg-primary-50/50">
      <div className={`w-1 shrink-0 ${accent}`} aria-hidden />
      <Link
        href={`/dashboard/documents/${document.id}` as Route}
        className="flex-1 text-left px-4 py-3 flex items-center gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-gradient-to-br from-primary-500 to-teal-700 text-white shadow-sm">
          {initialsFromName(document.title)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold truncate text-slate-900 group-hover:text-primary-800">
              {document.title}
            </span>
            <DocumentTypeBadge type={document.type} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <DocumentStatusBadge status={document.status} />
            {document.contactName ? (
              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                {document.contactName}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">No contact</span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatRelativeTime(document.updatedAt)}
            </span>
          </div>
        </div>
        <span
          className="material-symbols-outlined text-slate-300 group-hover:text-primary-500 text-[20px] shrink-0"
          aria-hidden
        >
          chevron_right
        </span>
      </Link>
      {document.contactId && document.contactName ? (
        <Link
          href={`/dashboard/contacts/${document.contactId}` as Route}
          className="hidden sm:inline-flex items-center gap-1 px-3 border-l border-primary-100 text-xs font-medium text-primary-700 hover:bg-primary-100/60 transition-colors"
          title={`Open ${document.contactName} in Contacts`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            person
          </span>
          Contact
        </Link>
      ) : null}
    </div>
  );
}
