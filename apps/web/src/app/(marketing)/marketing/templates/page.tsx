'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate } from '@/lib/api';
import { htmlToPlainPreview } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

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
  const [search, setSearch] = useState('');

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
    if (!window.confirm('Archive this template?')) return;
    setBusyId(templateId);
    try {
      await api.marketing.templates.archive(accountId, templateId, token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
    );
  }, [templates, search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <MarketingPageHeader
        title="Templates"
        search={
          <div className="relative hidden sm:block">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <MarketingIcon name="search" className="text-[20px]" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="block w-48 lg:w-64 pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-border text-sm"
            />
          </div>
        }
        action={
          <Link
            href={'/marketing/templates/new' as Route}
            className="bg-brand-indigo hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            New Template
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-8 max-w-container-max-list mx-auto w-full">
        {!loading && templates.length === 0 ? (
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center max-w-lg mx-auto mt-12">
            <div className="w-14 h-14 rounded-full bg-primary-surface text-primary flex items-center justify-center mx-auto mb-4">
              <MarketingIcon name="description" className="text-[28px]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No templates yet</h2>
            <p className="text-sm text-gray-500 mb-6">
              Build reusable emails with merge tags. Open the full-screen composer to create your
              first template.
            </p>
            <Link
              href={'/marketing/templates/new' as Route}
              className="inline-flex bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
            >
              Create template
            </Link>
          </section>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {loading
                ? 'Loading…'
                : `${filtered.length} template${filtered.length === 1 ? '' : 's'}`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <article
                  key={t.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:border-primary-border hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-primary">
                      {t.name}
                    </p>
                    <MarketingIcon name="mail" className="text-gray-300 group-hover:text-primary shrink-0" />
                  </div>
                  <p className="text-sm text-gray-600 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-2 flex-1 line-clamp-2">
                    {htmlToPlainPreview(t.htmlBody ?? '')}
                  </p>
                  {t.updatedAt && (
                    <p className="text-[11px] text-gray-400 mt-3">
                      Updated {formatUpdated(t.updatedAt)}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    <Link
                      href={`/marketing/templates/${t.id}/edit` as Route}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() => void duplicate(t.id)}
                      className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() => void archive(t.id)}
                      className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <MarketingListFooter />
    </div>
  );
}
