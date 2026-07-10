'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate } from '@/lib/api';
import { htmlToPlainPreview } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

const CATEGORIES: { id: string; label: string; badgeClass: string; gradient: string }[] = [
  { id: 'welcome', label: 'Welcome', badgeClass: 'bg-blue-100 text-blue-800', gradient: 'from-[#6366F1] to-[#4F46E5]' },
  { id: 'promotional', label: 'Promotional', badgeClass: 'bg-orange-100 text-orange-800', gradient: 'from-[#F59E0B] to-[#D97706]' },
  { id: 'nurture', label: 'Nurture', badgeClass: 'bg-teal-100 text-teal-800', gradient: 'from-[#14B8A6] to-[#0D9488]' },
  { id: 'transactional', label: 'Transactional', badgeClass: 'bg-purple-100 text-purple-800', gradient: 'from-[#8B5CF6] to-[#7C3AED]' },
];

function categoryMeta(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

function formatUpdated(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TemplateBrandedPreview({ template }: { template: EmailTemplate }) {
  const meta = categoryMeta(template.category);
  const preheader = htmlToPlainPreview(template.htmlBody ?? '').slice(0, 60);

  if (!meta) {
    return (
      <div className="h-24 bg-gray-100 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <MarketingIcon name="description" className="text-2xl" />
          <p className="text-xs mt-1">Uncategorized</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-24 bg-gradient-to-br ${meta.gradient} flex flex-col items-center justify-center text-white gap-1 px-4 text-center`}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-80">{meta.label}</span>
      <span className="text-sm font-bold truncate max-w-full">{template.subject}</span>
      {preheader && <span className="text-[11px] opacity-70 truncate max-w-full">{preheader}</span>}
    </div>
  );
}

export default function TemplatesPage() {
  const { token, accountId } = useAuthStore();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token || !accountId) return;
    setImporting(true);
    try {
      const html = await file.text();
      const name = file.name.replace(/\.(html?|htm)$/i, '') || 'Imported template';
      const res = await api.marketing.templates.create(
        accountId,
        { name, subject: name, htmlBody: html },
        token
      );
      router.push(`/marketing/templates/${res.template.id}/edit` as Route);
    } finally {
      setImporting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    });
  }, [templates, search, categoryFilter]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={(e) => void handleImportFile(e)}
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <MarketingIcon name="upload" className="text-[20px]" />
              {importing ? 'Importing…' : 'Import HTML'}
            </button>
            <Link
              href={'/marketing/templates/new' as Route}
              className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
            >
              <MarketingIcon name="add" className="text-[20px]" />
              Create template
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full">
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
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <p className="text-sm text-gray-500">
                {loading ? 'Loading…' : `${filtered.length} template${filtered.length === 1 ? '' : 's'}`}
              </p>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="ml-auto border border-gray-200 rounded-lg text-sm px-3 py-1.5"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t, i) => {
                const meta = categoryMeta(t.category);
                return (
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
                    <TemplateBrandedPreview template={t} />
                    <div className="p-5">
                      <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {t.name}
                      </p>
                      <p className="text-sm text-gray-600 truncate mt-0.5">{t.subject}</p>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[2.5rem]">
                        {htmlToPlainPreview(t.htmlBody ?? '')}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {meta && (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        )}
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {t.campaignCount ?? 0} campaign{(t.campaignCount ?? 0) === 1 ? '' : 's'}
                        </span>
                      </div>
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
                );
              })}
            </div>
          </>
        )}
      </div>

      <MarketingListFooter />
    </div>
  );
}
