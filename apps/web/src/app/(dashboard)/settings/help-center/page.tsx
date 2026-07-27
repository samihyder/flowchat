'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type HelpArticle, type HelpCategory, type HelpPortal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsCard } from '@/components/ui/settings-page';
import { checkboxClass, labelClass, selectClass } from '@/components/ui/form-field';

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function HelpCenterPage() {
  const { token, accountId } = useAuthStore();
  const [portals, setPortals] = useState<HelpPortal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [catName, setCatName] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleSlug, setArticleSlug] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [articleCategoryId, setArticleCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    const res = await api.helpCenter.portals.list(accountId, token);
    setPortals(res.portals);
  }, [token, accountId]);

  const loadPortalDetail = useCallback(
    async (portalId: string) => {
      if (!token || !accountId) return;
      const [cats, arts] = await Promise.all([
        api.helpCenter.portals.listCategories(accountId, portalId, token),
        api.helpCenter.portals.listArticles(accountId, portalId, token),
      ]);
      setCategories(cats.categories);
      setArticles(arts.articles);
    },
    [token, accountId]
  );

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (selectedId) loadPortalDetail(selectedId).catch(() => {});
    else {
      setCategories([]);
      setArticles([]);
    }
  }, [selectedId, loadPortalDetail]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !name.trim() || !slug.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.helpCenter.portals.create(
        accountId,
        { name: name.trim(), slug: slug.trim(), isPublished: false },
        token
      );
      setName('');
      setSlug('');
      setMessage('Portal created.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create portal');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (portal: HelpPortal) => {
    if (!token || !accountId) return;
    try {
      await api.helpCenter.portals.update(
        accountId,
        portal.id,
        { isPublished: !portal.isPublished },
        token
      );
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !selectedId || !catName.trim()) return;
    setSaving(true);
    try {
      await api.helpCenter.portals.createCategory(
        accountId,
        selectedId,
        { name: catName.trim() },
        token
      );
      setCatName('');
      await loadPortalDetail(selectedId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !selectedId || !articleTitle.trim() || !articleSlug.trim()) return;
    setSaving(true);
    try {
      await api.helpCenter.portals.createArticle(
        accountId,
        selectedId,
        {
          title: articleTitle.trim(),
          slug: articleSlug.trim(),
          bodyHtml: articleBody || '<p></p>',
          categoryId: articleCategoryId || null,
          status: 'draft',
        },
        token
      );
      setArticleTitle('');
      setArticleSlug('');
      setArticleBody('');
      setArticleCategoryId('');
      await loadPortalDetail(selectedId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard title="Create portal">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create portal'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </SettingsCard>

      <SettingsCard title="Portals">
        {portals.length === 0 ? (
          <p className="text-sm text-gray-500">No help portals yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {portals.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  className="text-left min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    /{p.slug} · {p.isPublished ? 'published' : 'draft'}
                    {selectedId === p.id ? ' · selected' : ''}
                  </p>
                </button>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={p.isPublished}
                    onChange={() => togglePublish(p)}
                  />
                  Published
                </label>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      {selectedId && (
        <>
          <SettingsCard title="Categories">
            <form onSubmit={handleCreateCategory} className="flex flex-wrap gap-2 mb-3">
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name"
                className="flex-1 min-w-[12rem]"
                required
              />
              <Button type="submit" disabled={saving}>
                Add category
              </Button>
            </form>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories yet.</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            )}
          </SettingsCard>

          <SettingsCard title="Articles">
            <form onSubmit={handleCreateArticle} className="space-y-3 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Title</label>
                  <Input
                    value={articleTitle}
                    onChange={(e) => {
                      setArticleTitle(e.target.value);
                      if (!articleSlug || articleSlug === slugify(articleTitle)) {
                        setArticleSlug(slugify(e.target.value));
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <Input
                    value={articleSlug}
                    onChange={(e) => setArticleSlug(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={articleCategoryId}
                    onChange={(e) => setArticleCategoryId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Body (HTML)</label>
                <Textarea
                  value={articleBody}
                  onChange={(e) => setArticleBody(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
              <Button type="submit" disabled={saving}>
                Create article
              </Button>
            </form>
            {articles.length === 0 ? (
              <p className="text-sm text-gray-500">No articles yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {articles.map((a) => (
                  <li key={a.id} className="py-2">
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-400">
                      /{a.slug} · {a.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SettingsCard>
        </>
      )}
    </div>
  );
}
