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

function TemplatePreviewSkeleton({ subject }: { subject: string }) {
  return (
    <div className="h-44 bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 p-5 flex flex-col gap-2 scale-90 group-hover:scale-95 transition-transform origin-top-left">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-2 w-1/2 bg-gray-200 rounded" />
        <p className="text-[10px] text-gray-400 mt-2 truncate">{subject}</p>
        <div className="mt-2 h-1.5 w-full bg-gray-100 rounded" />
        <div className="h-1.5 w-full bg-gray-100 rounded" />
        <div className="h-1.5 w-2/3 bg-gray-100 rounded" />
      </div>
      <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary-surface flex items-center justify-center">
        <MarketingIcon name="mail" className="text-primary text-[18px]" />
      </div>
    </div>
  );
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
      (t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
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
            className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            Create template
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-8 max-w-container-max-list mx-auto w-full">
        <header className="mb-8">
          <h2 className="text-headline-lg text-on-surface mb-2">Template library</h2>
          <p className="text-on-surface-variant max-w-lg text-sm">
            Manage reusable email modules. Use them in campaign sequences or open the full-screen
            composer to edit.
          </p>
        </header>

        {!loading && templates.length === 0 ? (
          <section className="relative min-h-[420px] rounded-3xl overflow-hidden flex items-center justify-center p-12 mt-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] via-white to-[#F0FDFA] opacity-90" />
            <div className="relative z-10 text-center max-w-lg">
              <div className="mb-8 relative inline-block">
                <div className="w-28 h-28 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto ring-1 ring-gray-100 -rotate-2">
                  <MarketingIcon name="description" className="text-5xl text-primary/50" />
                </div>
              </div>
              <h2 className="text-headline-md text-on-surface mb-3">No templates yet</h2>
              <p className="text-sm text-on-surface-variant mb-10 leading-relaxed">
                Build reusable emails with merge tags, then drop them into campaign sequences or save
                directly from the composer.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={'/marketing/templates/new' as Route}
                  className="inline-flex marketing-btn-primary px-8 py-3 rounded-xl font-bold text-sm shadow-lg"
                >
                  Start from scratch
                </Link>
                <Link
                  href={'/marketing/campaigns' as Route}
                  className="inline-flex text-primary font-bold text-sm hover:underline px-4 py-3"
                >
                  Browse campaigns →
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {loading ? 'Loading…' : `${filtered.length} template${filtered.length === 1 ? '' : 's'}`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t, i) => (
                <article
                  key={t.id}
                  className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary-border transition-all duration-300 animate-marketing-stagger-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="absolute top-3 right-3 z-10">
                    <details className="relative">
                      <summary
                        className="list-none p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-500 hover:text-gray-800 cursor-pointer shadow-sm"
                        aria-label="Template actions"
                      >
                        <MarketingIcon name="more_vert" className="text-[20px]" />
                      </summary>
                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm z-20">
                        <Link
                          href={`/marketing/templates/${t.id}/edit` as Route}
                          className="block px-3 py-2 hover:bg-gray-50 text-on-surface"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => void duplicate(t.id)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-on-surface-variant disabled:opacity-50"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => void archive(t.id)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-status-danger-text disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </div>
                    </details>
                  </div>
                  <TemplatePreviewSkeleton subject={t.subject} />
                  <div className="p-5">
                    <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                      {t.name}
                    </p>
                    <p className="text-sm text-gray-600 truncate mt-0.5">{t.subject}</p>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[2.5rem]">
                      {htmlToPlainPreview(t.htmlBody ?? '')}
                    </p>
                    {t.updatedAt && (
                      <p className="text-[11px] text-gray-400 mt-3">
                        Updated {formatUpdated(t.updatedAt)}
                      </p>
                    )}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
                      <Link
                        href={`/marketing/templates/${t.id}/edit` as Route}
                        className="text-xs font-bold text-primary hover:underline"
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
                        className="text-xs text-gray-500 hover:text-status-danger-text disabled:opacity-50"
                      >
                        Archive
                      </button>
                    </div>
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
