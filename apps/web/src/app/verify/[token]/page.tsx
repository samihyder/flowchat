'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, type DasVerifyResult } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { DocumentHtmlPreview } from '@/components/documents/document-html-preview';
import { formatDocumentType } from '@/lib/das/labels';

export default function DocumentVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<DasVerifyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    api.das.verify
      .get(token)
      .then(setResult)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Verification failed');
        setResult(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const hashShort = result?.sha256Hash
    ? `${result.sha256Hash.slice(0, 12)}…`
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm max-w-2xl w-full overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-primary-50/80 to-white">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600">
            FlowChat Documents
          </p>
          <h1 className="text-lg font-semibold text-gray-900 mt-1">
            Document verification
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Confirm authenticity of a finalized document.
          </p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {loading && (
            <p className="text-sm text-gray-400">Checking verification token…</p>
          )}

          {error && !loading && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error === 'Not found' || error.toLowerCase().includes('not found')
                ? 'This verification link is invalid or expired.'
                : error}
            </div>
          )}

          {result && !loading && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={result.valid ? 'success' : 'warning'}>
                  {result.valid
                    ? 'Verified'
                    : result.document.status === 'finalized'
                      ? 'Hash mismatch'
                      : 'Not finalized'}
                </Badge>
                <Badge color="primary">
                  {formatDocumentType(result.document.type)}
                </Badge>
                <Badge color="gray">{result.document.status}</Badge>
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {result.document.title}
                </h2>
                {result.brand.legalName && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {result.brand.legalName}
                  </p>
                )}
              </div>

              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-gray-400">
                    Content hash
                  </dt>
                  <dd className="font-mono text-gray-800 mt-0.5">{hashShort}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-gray-400">
                    Hash matches
                  </dt>
                  <dd className="text-gray-800 mt-0.5">
                    {result.hashMatches ? 'Yes' : 'No'}
                  </dd>
                </div>
                {result.document.finalizedAt && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-gray-400">
                      Finalized
                    </dt>
                    <dd className="text-gray-800 mt-0.5">
                      {new Date(result.document.finalizedAt).toLocaleString()}
                    </dd>
                  </div>
                )}
                {result.artifactUrl && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-gray-400">
                      Artifact
                    </dt>
                    <dd className="mt-0.5">
                      <a
                        href={result.artifactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Open artifact
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {result.valid && result.document.htmlSnapshot && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
                    Preview
                  </p>
                  <DocumentHtmlPreview
                    html={result.document.htmlSnapshot}
                    className="max-h-80"
                    title="Verified document preview"
                  />
                </div>
              )}
              {!result.valid && result.document.htmlSnapshot && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Preview hidden because this document failed integrity checks.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
