'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  api,
  type DasCatalogComponent,
  type DasCatalogItem,
  type DasCatalogInput,
  type DasCatalogItemType,
  type DasCatalogPrice,
} from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fieldClass } from '@/components/ui/form-field';

type Tab = 'products' | 'services';

const emptyForm = (): DasCatalogInput & { sku: string } => ({
  name: '',
  sku: '',
  skuAuto: true,
  unitPrice: 0,
  currency: 'USD',
  baseUnit: '',
  priceMode: 'fixed',
});

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function tabToItemType(tab: Tab): DasCatalogItemType {
  return tab === 'products' ? 'product' : 'service';
}

function childKey(type: DasCatalogItemType, id: string) {
  return `${type}:${id}`;
}

export default function DocumentsCatalogPage() {
  const { token, accountId } = useAuthStore();
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<DasCatalogItem[]>([]);
  const [services, setServices] = useState<DasCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DasCatalogInput | null>(null);

  const [extraPrices, setExtraPrices] = useState<DasCatalogPrice[]>([]);
  const [components, setComponents] = useState<DasCatalogComponent[]>([]);
  const [catalogMetaLoading, setCatalogMetaLoading] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ currency: '', unitPrice: 0 });
  const [componentDraft, setComponentDraft] = useState({
    childKey: '',
    quantity: 1,
  });

  const items = tab === 'products' ? products : services;
  const itemType = tabToItemType(tab);

  const catalogOptions = useMemo(() => {
    const opts: { key: string; label: string; type: DasCatalogItemType; id: string }[] = [];
    for (const p of products) {
      opts.push({
        key: childKey('product', p.id),
        label: `${p.name} (${p.sku}) · product`,
        type: 'product',
        id: p.id,
      });
    }
    for (const s of services) {
      opts.push({
        key: childKey('service', s.id),
        label: `${s.name} (${s.sku}) · service`,
        type: 'service',
        id: s.id,
      });
    }
    return opts;
  }, [products, services]);

  const resolveChildLabel = useCallback(
    (type: DasCatalogItemType, id: string) => {
      const list = type === 'product' ? products : services;
      const found = list.find((i) => i.id === id);
      if (!found) return `${type} ${id.slice(0, 8)}…`;
      return `${found.name} (${found.sku})`;
    },
    [products, services]
  );

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const [p, s] = await Promise.all([
        api.das.products.list(accountId, token),
        api.das.services.list(accountId, token),
      ]);
      setProducts(p.products);
      setServices(s.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [token, accountId]);

  const loadEditMeta = useCallback(
    async (id: string, type: DasCatalogItemType) => {
      if (!token || !accountId) return;
      setCatalogMetaLoading(true);
      try {
        const [pricesRes, componentsRes] = await Promise.all([
          api.das.catalog.prices.list(accountId, token, {
            itemType: type,
            itemId: id,
          }),
          api.das.catalog.components.list(accountId, token, {
            parentType: type,
            parentId: id,
          }),
        ]);
        setExtraPrices(pricesRes.prices);
        setComponents(componentsRes.components);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load prices/components'
        );
      } finally {
        setCatalogMetaLoading(false);
      }
    },
    [token, accountId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const handle = window.setTimeout(() => setMsg(''), 2200);
    return () => window.clearTimeout(handle);
  }, [msg]);

  const handleCreate = async () => {
    if (!token || !accountId || !form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body: DasCatalogInput = {
        name: form.name.trim(),
        skuAuto: form.skuAuto !== false,
        sku: form.skuAuto === false ? form.sku.trim() || undefined : undefined,
        unitPrice: Number(form.unitPrice) || 0,
        currency: (form.currency || 'USD').toUpperCase(),
        baseUnit: form.baseUnit?.trim() || null,
        priceMode: form.priceMode || 'fixed',
      };
      if (tab === 'products') {
        const res = await api.das.products.create(accountId, body, token);
        setProducts((prev) => [...prev, res.product].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const res = await api.das.services.create(accountId, body, token);
        setServices((prev) => [...prev, res.service].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setForm(emptyForm());
      setMsg(`${tab === 'products' ? 'Product' : 'Service'} created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  const clearEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setExtraPrices([]);
    setComponents([]);
    setPriceDraft({ currency: '', unitPrice: 0 });
    setComponentDraft({ childKey: '', quantity: 1 });
  };

  const startEdit = (item: DasCatalogItem) => {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      sku: item.sku,
      skuAuto: item.skuAuto,
      unitPrice: item.unitPrice,
      currency: item.currency,
      baseUnit: item.baseUnit ?? '',
      priceMode: item.priceMode,
    });
    setPriceDraft({ currency: '', unitPrice: 0 });
    setComponentDraft({ childKey: '', quantity: 1 });
    void loadEditMeta(item.id, itemType);
  };

  const handleSaveEdit = async () => {
    if (!token || !accountId || !editingId || !editDraft?.name?.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body: Partial<DasCatalogInput> = {
        name: editDraft.name.trim(),
        sku: editDraft.sku?.trim(),
        skuAuto: editDraft.skuAuto,
        unitPrice: Number(editDraft.unitPrice) || 0,
        currency: (editDraft.currency || 'USD').toUpperCase(),
        baseUnit: editDraft.baseUnit?.trim() || null,
        priceMode: editDraft.priceMode || 'fixed',
      };
      if (tab === 'products') {
        const res = await api.das.products.update(accountId, editingId, body, token);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? res.product : p))
        );
      } else {
        const res = await api.das.services.update(accountId, editingId, body, token);
        setServices((prev) =>
          prev.map((s) => (s.id === editingId ? res.service : s))
        );
      }
      clearEdit();
      setMsg('Item updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !accountId) return;
    if (!window.confirm('Delete this catalog item?')) return;
    setError('');
    try {
      if (tab === 'products') {
        await api.das.products.delete(accountId, id, token);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        await api.das.services.delete(accountId, id, token);
        setServices((prev) => prev.filter((s) => s.id !== id));
      }
      if (editingId === id) clearEdit();
      setMsg('Item deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleAddPrice = async () => {
    if (!token || !accountId || !editingId) return;
    const currency = priceDraft.currency.trim().toUpperCase();
    if (!currency) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.das.catalog.prices.create(
        accountId,
        {
          itemType,
          itemId: editingId,
          currency,
          unitPrice: Number(priceDraft.unitPrice) || 0,
        },
        token
      );
      setExtraPrices((prev) =>
        [...prev, res.price].sort((a, b) => a.currency.localeCompare(b.currency))
      );
      setPriceDraft({ currency: '', unitPrice: 0 });
      setMsg('Price added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add price');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!token || !accountId) return;
    setError('');
    try {
      await api.das.catalog.prices.delete(accountId, priceId, token);
      setExtraPrices((prev) => prev.filter((p) => p.id !== priceId));
      setMsg('Price removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete price');
    }
  };

  const handleAddComponent = async () => {
    if (!token || !accountId || !editingId || !componentDraft.childKey) return;
    const selected = catalogOptions.find((o) => o.key === componentDraft.childKey);
    if (!selected) return;
    if (selected.type === itemType && selected.id === editingId) {
      setError('Component cannot reference itself');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.das.catalog.components.create(
        accountId,
        {
          parentType: itemType,
          parentId: editingId,
          childType: selected.type,
          childId: selected.id,
          quantity: Number(componentDraft.quantity) || 1,
        },
        token
      );
      setComponents((prev) => [...prev, res.component]);
      setComponentDraft({ childKey: '', quantity: 1 });
      setMsg('Component added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!token || !accountId) return;
    setError('');
    try {
      await api.das.catalog.components.delete(accountId, componentId, token);
      setComponents((prev) => prev.filter((c) => c.id !== componentId));
      setMsg('Component removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component');
    }
  };

  const componentChoices = catalogOptions.filter(
    (o) => !(editingId && o.type === itemType && o.id === editingId)
  );

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Catalog"
        description="Products and services for document line items"
      />

      <div className="mx-6 mt-4 mb-3 flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto shrink-0">
        <Fact label="Products" value={loading ? '—' : products.length} />
        <Fact label="Services" value={loading ? '—' : services.length} />
        <Fact label="Showing" value={loading ? '—' : items.length} />
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

      <div className="mx-6 mb-3 flex gap-1 p-1 bg-white border border-gray-200 rounded-xl shadow-sm w-fit shrink-0">
        {(['products', 'services'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              clearEdit();
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'products' ? 'Products' : 'Services'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6 space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            New {tab === 'products' ? 'product' : 'service'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Item name"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">SKU</label>
              <Input
                value={form.skuAuto ? '' : form.sku}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value, skuAuto: false }))
                }
                placeholder={form.skuAuto ? 'Auto-generated' : 'SKU'}
                disabled={form.skuAuto}
              />
              <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={form.skuAuto !== false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, skuAuto: e.target.checked }))
                  }
                />
                Auto SKU
              </label>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unit price</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Currency</label>
              <Input
                value={form.currency ?? 'USD'}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unit</label>
              <Input
                value={form.baseUnit ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, baseUnit: e.target.value }))}
                placeholder="ea, hr, seat…"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Price mode</label>
              <select
                className={fieldClass}
                value={form.priceMode ?? 'fixed'}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priceMode: e.target.value as 'fixed' | 'rollup',
                  }))
                }
              >
                <option value="fixed">Fixed</option>
                <option value="rollup">Rollup</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={saving || !form.name.trim()}
              onClick={() => void handleCreate()}
            >
              {saving ? 'Saving…' : `Add ${tab === 'products' ? 'product' : 'service'}`}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {tab === 'products' ? 'Products' : 'Services'}
            </h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No items yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  {editingId === item.id && editDraft ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <Input
                          value={editDraft.name}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))
                          }
                          placeholder="Name"
                        />
                        <Input
                          value={editDraft.sku ?? ''}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, sku: e.target.value } : d))
                          }
                          placeholder="SKU"
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editDraft.unitPrice ?? 0}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d ? { ...d, unitPrice: Number(e.target.value) } : d
                            )
                          }
                        />
                        <Input
                          value={editDraft.currency ?? 'USD'}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d ? { ...d, currency: e.target.value } : d
                            )
                          }
                        />
                        <Input
                          value={editDraft.baseUnit ?? ''}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d ? { ...d, baseUnit: e.target.value } : d
                            )
                          }
                          placeholder="Unit"
                        />
                        <select
                          className={fieldClass}
                          value={editDraft.priceMode ?? 'fixed'}
                          onChange={(e) =>
                            setEditDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    priceMode: e.target.value as 'fixed' | 'rollup',
                                  }
                                : d
                            )
                          }
                        >
                          <option value="fixed">Fixed</option>
                          <option value="rollup">Rollup</option>
                        </select>
                      </div>

                      <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            Extra currency prices
                          </h3>
                          {catalogMetaLoading && (
                            <span className="text-xs text-gray-400">Loading…</span>
                          )}
                        </div>
                        {extraPrices.length === 0 ? (
                          <p className="text-xs text-gray-400">No extra currencies yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {extraPrices.map((price) => (
                              <li
                                key={price.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Badge color="gray">{price.currency}</Badge>
                                <span className="text-gray-800 flex-1">
                                  {formatMoney(price.unitPrice, price.currency)}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void handleDeletePrice(price.id)}
                                >
                                  Delete
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="w-24">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Currency
                            </label>
                            <Input
                              value={priceDraft.currency}
                              onChange={(e) =>
                                setPriceDraft((d) => ({
                                  ...d,
                                  currency: e.target.value,
                                }))
                              }
                              placeholder="EUR"
                            />
                          </div>
                          <div className="w-32">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Unit price
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={priceDraft.unitPrice}
                              onChange={(e) =>
                                setPriceDraft((d) => ({
                                  ...d,
                                  unitPrice: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving || !priceDraft.currency.trim()}
                            onClick={() => void handleAddPrice()}
                          >
                            Add price
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-3">
                        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          Components
                        </h3>
                        {components.length === 0 ? (
                          <p className="text-xs text-gray-400">No components yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {components.map((comp) => (
                              <li
                                key={comp.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Badge color="accent">{comp.childType}</Badge>
                                <span className="text-gray-800 flex-1 truncate">
                                  {resolveChildLabel(comp.childType, comp.childId)}
                                  {comp.label ? ` · ${comp.label}` : ''}
                                </span>
                                <span className="text-xs text-gray-500 shrink-0">
                                  × {comp.quantity}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void handleDeleteComponent(comp.id)}
                                >
                                  Delete
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[14rem] flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Child item
                            </label>
                            <select
                              className={fieldClass}
                              value={componentDraft.childKey}
                              onChange={(e) =>
                                setComponentDraft((d) => ({
                                  ...d,
                                  childKey: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select product or service…</option>
                              {componentChoices.map((o) => (
                                <option key={o.key} value={o.key}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                            <Input
                              type="number"
                              min={0.0001}
                              step="0.01"
                              value={componentDraft.quantity}
                              onChange={(e) =>
                                setComponentDraft((d) => ({
                                  ...d,
                                  quantity: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving || !componentDraft.childKey}
                            onClick={() => void handleAddComponent()}
                          >
                            Add component
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={saving}
                          onClick={() => void handleSaveEdit()}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={clearEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <Badge color="gray">{item.sku}</Badge>
                          <Badge color={item.priceMode === 'fixed' ? 'primary' : 'accent'}>
                            {item.priceMode}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatMoney(item.unitPrice, item.currency)}
                          {item.baseUnit ? ` / ${item.baseUnit}` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
