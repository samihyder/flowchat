'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type DasDocument } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';

export default function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { token, accountId } = useAuthStore();
  const [document, setDocument] = useState<DasDocument | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !accountId || !documentId) return;
    setLoading(true);
    api.das.documents
      .get(accountId, documentId, token)
      .then((r) => setDocument(r.document))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load document')
      )
      .finally(() => setLoading(false));
  }, [token, accountId, documentId]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link
          href={'/dashboard/documents' as Route}
          className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          ← Documents
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : document ? (
        <>
          <PageHeader
            title={document.title}
            description={`${document.type} · ${document.status}`}
          />
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Type</p>
                <p className="capitalize font-medium text-gray-900">{document.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                <p className="font-medium text-gray-900">{document.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Contact</p>
                <p className="font-medium text-gray-900">{document.contactName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Updated</p>
                <p className="font-medium text-gray-900">
                  {new Date(document.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              Document record in Flow CRM. Linked to your workspace account; optional contact
              association uses Flow contacts.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
