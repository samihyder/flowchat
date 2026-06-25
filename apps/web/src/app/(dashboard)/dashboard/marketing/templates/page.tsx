'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { htmlToPlainPreview } from '@/components/marketing/email-rich-editor';

function formatUpdated(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function TemplatesPage() {
  const { token, accountId } = useAuthStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!token || !accountId) return;
    setLoading(true);
    api.marketing.templates
      .list(accountId, token)
      .then((r) => setTemplates(r.templates))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, accountId]);

  const duplicate = async (templateId: string) => {
    if (!token || !accountId) return;
    setBusyId(templateId);
    try {
      await api.marketing.templates.duplicate(accountId, templateId, token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (templateId: string) => {
    if (!token || !accountId) return;
    if (!window.confirm('Archive this template? You can create a new one anytime.')) return;
    setBusyId(templateId);
    try {
      await api.marketing.templates.archive(accountId, templateId, token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => ({ templates: templates.length }), [templates.length]);

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Email templates"
        description="Reusable content for campaign sequences — no attachments (S6M-20)"
        action={
          <Link href={'/dashboard/marketing/templates/new' as Route}>
            <Button type="button">+ New template</Button>
          </Link>
        }
      />

      <div className="px-6 pb-6 space-y-6 flex-1">
        {!loading && templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-gray-300 rounded-2xl bg-gray-50">
            <p className="text-4xl mb-4">📝</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h2>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Build reusable emails with merge tags. Open the full-screen composer to create your first
              template.
            </p>
            <Link href={'/dashboard/marketing/templates/new' as Route}>
              <Button type="button">Create template</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${stats.templates} saved template${stats.templates === 1 ? '' : 's'}`}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <article
                  key={t.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col hover:border-primary-200 transition-colors"
                >
                  <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                  <p className="text-sm text-gray-600 mt-1 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-2 flex-1 line-clamp-2">
                    {htmlToPlainPreview(t.htmlBody ?? '')}
                  </p>
                  {t.updatedAt && (
                    <p className="text-[11px] text-gray-400 mt-2">Updated {formatUpdated(t.updatedAt)}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    <Link href={`/dashboard/marketing/templates/${t.id}/edit` as Route}>
                      <Button type="button" size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === t.id}
                      onClick={() => void duplicate(t.id)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === t.id}
                      onClick={() => void archive(t.id)}
                    >
                      Archive
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
