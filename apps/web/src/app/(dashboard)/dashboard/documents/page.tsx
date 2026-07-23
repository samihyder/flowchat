'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { useAuthStore } from '@/store/auth';
import { api, type DasDocument } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentCreateModal } from '@/components/documents/document-create-modal';
import { DocumentListItem } from '@/components/documents/document-list-item';
import {
  documentStatusOptions,
  documentTypeOptions,
} from '@/lib/das/labels';
import type { DasDocumentType } from '@/lib/das/types';

const PAGE_SIZE = 50;

function Fact({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'slate' | 'amber' | 'cyan' | 'emerald' | 'primary';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white',
    amber: 'border-amber-200 bg-amber-50/80',
    cyan: 'border-cyan-200 bg-cyan-50/80',
    emerald: 'border-emerald-200 bg-emerald-50/80',
    primary: 'border-primary-200 bg-primary-50/80',
  } as const;
  const labelTone = {
    slate: 'text-slate-400',
    amber: 'text-amber-700/70',
    cyan: 'text-cyan-700/70',
    emerald: 'text-emerald-700/70',
    primary: 'text-primary-700/70',
  } as const;
  return (
    <div className={`px-4 py-3 border-r last:border-r-0 shrink-0 ${tones[tone]}`}>
      <p className={`text-[10px] uppercase tracking-wide font-semibold ${labelTone[tone]}`}>
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

type StatusCounts = {
  draft: number;
  pending_approval: number;
  approved: number;
  finalized: number;
};

function countStatuses(docs: DasDocument[]): StatusCounts {
  const next: StatusCounts = {
    draft: 0,
    pending_approval: 0,
    approved: 0,
    finalized: 0,
  };
  for (const doc of docs) {
    if (doc.status in next) {
      next[doc.status as keyof StatusCounts] += 1;
    }
  }
  return next;
}

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactIdFilter = searchParams.get('contactId')?.trim() || '';
  const { token, accountId } = useAuthStore();
  const [documents, setDocuments] = useState<DasDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [stats, setStats] = useState<StatusCounts>({
    draft: 0,
    pending_approval: 0,
    approved: 0,
    finalized: 0,
  });
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, status, type, contactIdFilter]);

  useEffect(() => {
    if (!token || !accountId || !contactIdFilter) {
      setContactName('');
      return;
    }
    api.contacts
      .get(accountId, contactIdFilter, token)
      .then((r) => setContactName(r.contact.name))
      .catch(() => setContactName(''));
  }, [token, accountId, contactIdFilter]);

  const loadOverview = useCallback(async () => {
    if (!token || !accountId) return;
    try {
      const res = await api.das.documents.list(accountId, token, { limit: 200 });
      setOverviewTotal(res.total);
      setStats(countStatuses(res.documents));
    } catch {
      /* keep prior overview */
    }
  }, [token, accountId]);

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.documents.list(accountId, token, {
        q: debouncedQ || undefined,
        status: status || undefined,
        type: type || undefined,
        contactId: contactIdFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setDocuments(res.documents);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [token, accountId, debouncedQ, status, type, page, contactIdFilter]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearContactFilter = () => {
    router.push('/dashboard/documents' as Route);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);
  const filtersActive = Boolean(debouncedQ || status || type || contactIdFilter);
  const showInitialLoad = loading && !hasLoadedOnce.current;

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Document library"
        description={
          showInitialLoad
            ? 'Quotations, invoices, proposals, and agreements'
            : filtersActive
              ? `${total} match${total === 1 ? '' : 'es'} · ${overviewTotal} total`
              : `${overviewTotal} document${overviewTotal === 1 ? '' : 's'} across your CRM`
        }
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            + New document
          </Button>
        }
      />

      <div className="mx-6 mt-4 mb-3 flex items-stretch rounded-xl border border-primary-200/70 shadow-sm overflow-x-auto shrink-0 divide-x divide-primary-100/80">
        <Fact label="Total documents" value={showInitialLoad ? '—' : overviewTotal} tone="cyan" />
        <Fact label="Drafts" value={showInitialLoad ? '—' : stats.draft} tone="slate" />
        <Fact
          label="Pending approval"
          value={showInitialLoad ? '—' : stats.pending_approval}
          tone="amber"
        />
        <Fact label="Approved" value={showInitialLoad ? '—' : stats.approved} tone="primary" />
        <Fact label="Finalized" value={showInitialLoad ? '—' : stats.finalized} tone="emerald" />
      </div>

      {error && (
        <div className="mx-6 mb-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex-1 flex min-h-0 mx-6 mb-6 rounded-xl border border-primary-200/70 bg-white/90 shadow-sm overflow-hidden ring-1 ring-primary-100/50">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="shrink-0 p-3 border-b border-primary-100 bg-gradient-to-r from-primary-50/90 to-cyan-50/50">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search documents…"
                className="flex-1 min-w-[140px]"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-2 py-2 text-xs border border-primary-200 rounded-lg bg-white"
              >
                <option value="">All types</option>
                {documentTypeOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-2 py-2 text-xs border border-primary-200 rounded-lg bg-white"
              >
                <option value="">All statuses</option>
                {documentStatusOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {contactIdFilter && (
                <button
                  type="button"
                  onClick={clearContactFilter}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-xs text-primary-800 hover:bg-primary-100"
                >
                  Contact: {contactName || '…'}
                  <span aria-hidden>×</span>
                </button>
              )}
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setDebouncedQ('');
                    setType('');
                    setStatus('');
                    if (contactIdFilter) clearContactFilter();
                  }}
                  className="text-xs text-primary-600 hover:underline px-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
            <span>
              {loading && hasLoadedOnce.current
                ? 'Updating…'
                : showInitialLoad
                  ? 'Loading…'
                  : `${rangeStart}–${rangeEnd} of ${total}`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {showInitialLoad ? (
              <p className="p-8 text-center text-sm text-gray-400">Loading documents…</p>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">
                  {filtersActive
                    ? 'No documents match your filters.'
                    : 'No documents yet. Create a draft to get started.'}
                </p>
                {!filtersActive && (
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setCreateOpen(true)}
                  >
                    + New document
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={
                  loading ? 'opacity-60 transition-opacity' : 'transition-opacity'
                }
              >
                {documents.map((doc) => (
                  <DocumentListItem key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {page + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {token && accountId && (
        <DocumentCreateModal
          open={createOpen}
          token={token}
          accountId={accountId}
          onClose={() => setCreateOpen(false)}
          initialContactId={contactIdFilter || undefined}
          initialContactName={contactName || undefined}
          lockContact={Boolean(contactIdFilter)}
          onCreate={async (input) => {
            const res = await api.das.documents.create(
              accountId,
              {
                type: input.type as DasDocumentType,
                title: input.title,
                contactId: input.contactId,
                templateId: input.templateId,
              },
              token
            );
            setCreateOpen(false);
            void loadOverview();
            router.push(`/dashboard/documents/${res.document.id}` as Route);
          }}
        />
      )}
    </div>
  );
}
