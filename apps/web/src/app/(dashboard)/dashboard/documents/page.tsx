'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type DasDocument } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DAS_DOCUMENT_TYPES } from '@/lib/das/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  finalized: 'Finalized',
  archived: 'Archived',
};

export default function DocumentsPage() {
  const { token, accountId } = useAuthStore();
  const [documents, setDocuments] = useState<DasDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof DAS_DOCUMENT_TYPES)[number]>('quotation');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.documents.list(accountId, token, {
        q: q.trim() || undefined,
      });
      setDocuments(res.documents);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [token, accountId, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const createDraft = async () => {
    if (!token || !accountId || !title.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.das.documents.create(
        accountId,
        { type, title: title.trim() },
        token
      );
      setTitle('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Documents"
        description="Quotations, invoices, proposals, SLAs, and NDAs — Flow CRM document automation."
      />

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900">New draft</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[140px]">
            <label className="text-xs text-gray-500">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof DAS_DOCUMENT_TYPES)[number])
              }
            >
              {DAS_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500">Title</label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 proposal for Acme"
            />
          </div>
          <Button
            type="button"
            disabled={creating || !title.trim()}
            onClick={() => void createDraft()}
          >
            {creating ? 'Creating…' : 'Create draft'}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documents…"
          className="max-w-sm"
        />
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Search
        </Button>
        <p className="text-sm text-gray-500 ml-auto">{total} document{total === 1 ? '' : 's'}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
          No documents yet. Create a draft to start.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/documents/${doc.id}` as Route}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{doc.type}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {STATUS_LABELS[doc.status] ?? doc.status}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.contactName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
