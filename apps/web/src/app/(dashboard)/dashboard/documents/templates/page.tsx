'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type DasDocument, type DasTemplate } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fieldClass } from '@/components/ui/form-field';
import { DocumentTypeBadge } from '@/components/documents/document-badges';
import { documentTypeOptions } from '@/lib/das/labels';

const DEFAULT_HTML = `<h1>{{document.title}}</h1>
<p>{{brand.legalName}}</p>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
  <tbody>
    {{#each lineItems}}
    <tr>
      <td>{{name}}</td>
      <td>{{quantity}}</td>
      <td>{{unitPrice}} {{currency}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`;

type FormState = {
  name: string;
  type: DasDocument['type'];
  handlebarsHtml: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  type: 'quotation',
  handlebarsHtml: DEFAULT_HTML,
  isActive: true,
});

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export default function DocumentsTemplatesPage() {
  const { token, accountId } = useAuthStore();
  const [templates, setTemplates] = useState<DasTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.das.templates.list(accountId, token);
      setTemplates(res.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [token, accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const handle = window.setTimeout(() => setMsg(''), 2200);
    return () => window.clearTimeout(handle);
  }, [msg]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const startEdit = (t: DasTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      type: t.type,
      handlebarsHtml: t.handlebarsHtml ?? '',
      isActive: t.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token || !accountId || !form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        handlebarsHtml: form.handlebarsHtml.trim() || null,
        isActive: form.isActive,
      };
      if (editingId) {
        const res = await api.das.templates.update(accountId, editingId, body, token);
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingId ? res.template : t))
        );
        setMsg('Template updated');
      } else {
        const res = await api.das.templates.create(accountId, body, token);
        setTemplates((prev) => [res.template, ...prev]);
        setMsg('Template created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !accountId) return;
    if (!window.confirm('Delete this template?')) return;
    setError('');
    try {
      await api.das.templates.delete(accountId, id, token);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) {
        setShowForm(false);
        setEditingId(null);
      }
      setMsg('Template deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const activeCount = templates.filter((t) => t.isActive).length;

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Templates"
        description="Handlebars HTML templates for quotations, invoices, and agreements"
        action={
          <Button type="button" onClick={startCreate}>
            + New template
          </Button>
        }
      />

      <div className="mx-6 mt-4 mb-3 flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto shrink-0">
        <Fact label="Templates" value={loading ? '—' : templates.length} />
        <Fact label="Active" value={loading ? '—' : activeCount} />
      </div>

      {(error || msg) && (
        <div
          className={`mx-6 mb-3 text-sm rounded-lg px-4 py-3 border shrink-0 ${
            error
              ? 'text-red-800 bg-red-50 border-red-200'
              : 'text-primary-900 bg-primary-50 border-primary-200'
          }`}
        >
          {error || msg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6 space-y-6">
        {showForm && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {editingId ? 'Edit template' : 'New template'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Standard quotation"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select
                  className={fieldClass}
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as DasDocument['type'],
                    }))
                  }
                >
                  {documentTypeOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Handlebars HTML</label>
              <textarea
                className={`${fieldClass} font-mono text-xs min-h-[220px]`}
                value={form.handlebarsHtml}
                onChange={(e) =>
                  setForm((f) => ({ ...f, handlebarsHtml: e.target.value }))
                }
                spellCheck={false}
              />
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Helpers:{' '}
                <code className="text-primary-700">{'{{document.title}}'}</code>,{' '}
                <code className="text-primary-700">{'{{brand.legalName}}'}</code>,{' '}
                <code className="text-primary-700">
                  {'{{#each lineItems}}...{{/each}}'}
                </code>
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create template'}
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              All templates
            </h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">No templates yet.</p>
              <Button type="button" className="mt-4" onClick={startCreate}>
                + New template
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {templates.map((t) => (
                <li key={t.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                      <DocumentTypeBadge type={t.type} />
                      <Badge color={t.isActive ? 'success' : 'gray'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-gray-400">v{t.version}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {t.handlebarsHtml
                        ? `${t.handlebarsHtml.slice(0, 80).replace(/\s+/g, ' ')}…`
                        : 'No HTML body'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(t)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(t.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
