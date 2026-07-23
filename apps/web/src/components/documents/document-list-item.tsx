'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { DasDocument } from '@/lib/api';
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from '@/components/documents/document-badges';
import { formatRelativeTime, initialsFromName } from '@/lib/format';

export function DocumentListItem({ document }: { document: DasDocument }) {
  return (
    <div className="flex items-stretch border-b border-gray-100 transition-colors hover:bg-gray-50">
      <Link
        href={`/dashboard/documents/${document.id}` as Route}
        className="flex-1 text-left px-4 py-3 flex items-center gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary-100 text-primary-700">
          {initialsFromName(document.title)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate text-gray-900">{document.title}</span>
            <DocumentTypeBadge type={document.type} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <DocumentStatusBadge status={document.status} />
            {document.contactName ? (
              <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                {document.contactName}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">No contact</span>
            )}
            <span className="text-[10px] text-gray-400">
              {formatRelativeTime(document.updatedAt)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
