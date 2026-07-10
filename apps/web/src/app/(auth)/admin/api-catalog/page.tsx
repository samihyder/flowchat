'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuthBootstrap } from '@/lib/useAuthBootstrap';
import { api, type ApiCatalogEndpoint } from '@/lib/api';
import { AuthLogo } from '@/components/layout/auth-shell';
import { AdminRichTextEditor } from '@/components/admin/admin-rich-text-editor';

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PATCH: 'bg-amber-100 text-amber-700',
  PUT: 'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700',
};

function groupKey(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts[1] === 'accounts' && parts[2] === '[accountId]') {
    return parts[3] ?? 'accounts';
  }
  return parts[1] ?? 'root';
}

function rowKey(e: { path: string; method: string }) {
  return `${e.path}::${e.method}`;
}

export default function ApiCatalogPage() {
  const router = useRouter();
  const { ready, token, isSuperAdmin } = useAuthBootstrap();
  const [endpoints, setEndpoints] = useState<ApiCatalogEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push('/sign-in');
      return;
    }
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    api.admin.apiCatalog
      .list(token)
      .then((r) => setEndpoints(r.endpoints))
      .finally(() => setLoading(false));
  }, [ready, token, isSuperAdmin, router]);

  const groups = useMemo(() => {
    const map = new Map<string, ApiCatalogEndpoint[]>();
    for (const e of endpoints) {
      const g = groupKey(e.path);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [endpoints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return endpoints.filter((e) => {
      if (activeGroup && groupKey(e.path) !== activeGroup) return false;
      if (!q) return true;
      return e.path.toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
    });
  }, [endpoints, search, activeGroup]);

  const documented = endpoints.filter((e) => e.descriptionHtml.trim().length > 0).length;

  const toggleExpand = (e: ApiCatalogEndpoint) => {
    const key = rowKey(e);
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    setDrafts((prev) => (key in prev ? prev : { ...prev, [key]: e.descriptionHtml }));
  };

  const save = async (e: ApiCatalogEndpoint) => {
    if (!token) return;
    const key = rowKey(e);
    setSaving(key);
    try {
      const res = await api.admin.apiCatalog.update(e.path, e.method, drafts[key] ?? '', token);
      setEndpoints((prev) => prev.map((ep) => (rowKey(ep) === key ? { ...ep, ...res.entry } : ep)));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-[#F0FDF4] to-white px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <AuthLogo centered={false} />
          <button
            type="button"
            onClick={() => router.push('/select-workspace' as Route)}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            ← Back to workspaces
          </button>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 text-primary-700 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-3">
            Super admin · Observability
          </div>
          <h1 className="text-[28px] font-bold text-gray-900">API Catalog</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Every API endpoint in the product, auto-discovered from the codebase. Document how each
            one is used — descriptions are visible only here.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Endpoints', value: endpoints.length },
            { label: 'Documented', value: documented },
            { label: 'Undocumented', value: endpoints.length - documented },
            { label: 'Resource groups', value: groups.length },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by path or method…"
            className="w-full max-w-sm px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveGroup(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeGroup === null
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {groups.map(([g, list]) => (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeGroup === g
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {g} <span className="opacity-60">({list.length})</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading API catalog…</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 px-6 py-10 text-center">No endpoints match.</p>
            ) : (
              filtered.map((e) => {
                const key = rowKey(e);
                const isOpen = expanded === key;
                return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(e)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 w-16 text-center ${
                          METHOD_STYLES[e.method] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {e.method}
                      </span>
                      <span className="font-mono text-[13px] text-gray-800 truncate flex-1">
                        {e.path}
                      </span>
                      {e.descriptionHtml.trim() ? (
                        <span className="text-[10px] font-medium text-green-600 shrink-0">Documented</span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 shrink-0">No notes</span>
                      )}
                      <span className="text-gray-400 shrink-0">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100">
                        <p className="text-[11px] text-gray-400 font-mono py-3">{e.filePath}</p>
                        <AdminRichTextEditor
                          value={drafts[key] ?? e.descriptionHtml}
                          onChange={(html) => setDrafts((prev) => ({ ...prev, [key]: html }))}
                          placeholder="What does this endpoint do? Who calls it? Any gotchas?"
                        />
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[11px] text-gray-400">
                            {e.updatedAt ? `Last updated ${new Date(e.updatedAt).toLocaleString()}` : 'Never documented'}
                          </span>
                          <button
                            type="button"
                            disabled={saving === key}
                            onClick={() => void save(e)}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 transition-colors"
                          >
                            {saving === key ? 'Saving…' : 'Save notes'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
