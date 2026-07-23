'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  api,
  type DasAsset,
  type DasAssetKind,
  type DasBrandProfile,
} from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fieldClass } from '@/components/ui/form-field';
import { DAS_ASSET_KINDS } from '@/lib/das/types';

const UPLOAD_KINDS: DasAssetKind[] = ['stamp', 'seal', 'signature', 'initials', 'logo'];

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 shrink-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function kindLabel(kind: string) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export default function DocumentsBrandPage() {
  const { token, accountId } = useAuthStore();
  const [brand, setBrand] = useState<DasBrandProfile | null>(null);
  const [assets, setAssets] = useState<DasAsset[]>([]);
  const [legalName, setLegalName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [letterheadUrl, setLetterheadUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [uploadKind, setUploadKind] = useState<DasAssetKind>('logo');
  const [uploadLabel, setUploadLabel] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const [brandRes, assetsRes] = await Promise.all([
        api.das.brand.get(accountId, token),
        api.das.assets.list(accountId, token),
      ]);
      setBrand(brandRes.brand);
      setLegalName(brandRes.brand.legalName ?? '');
      setLogoUrl(brandRes.brand.logoUrl ?? '');
      setLetterheadUrl(brandRes.brand.letterheadUrl ?? '');
      setAssets(assetsRes.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand');
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

  const filteredAssets = useMemo(
    () => (kindFilter ? assets.filter((a) => a.kind === kindFilter) : assets),
    [assets, kindFilter]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const kind of DAS_ASSET_KINDS) map[kind] = 0;
    for (const a of assets) map[a.kind] = (map[a.kind] ?? 0) + 1;
    return map;
  }, [assets]);

  const handleSaveBrand = async () => {
    if (!token || !accountId) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.das.brand.update(
        accountId,
        {
          legalName: legalName.trim() || null,
          logoUrl: logoUrl.trim() || null,
          letterheadUrl: letterheadUrl.trim() || null,
        },
        token
      );
      setBrand(res.brand);
      setMsg('Brand profile saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!token || !accountId) return;
    setUploading(true);
    setError('');
    try {
      const upload = await api.das.assets.uploadUrl(
        accountId,
        {
          contentType: file.type || 'application/octet-stream',
          kind: uploadKind,
          fileName: file.name,
        },
        token
      );

      const put = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) {
        throw new Error('Upload to storage failed');
      }

      const created = await api.das.assets.create(
        accountId,
        {
          kind: uploadKind,
          label: uploadLabel.trim() || file.name,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          storageKey: upload.storageKey,
          publicUrl: upload.publicUrl,
        },
        token
      );
      setAssets((prev) => [created.asset, ...prev]);
      setUploadLabel('');
      if (fileRef.current) fileRef.current.value = '';
      setMsg('Asset uploaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload asset');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!token || !accountId) return;
    if (!window.confirm('Delete this asset?')) return;
    setError('');
    try {
      await api.das.assets.delete(accountId, assetId, token);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setMsg('Asset deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Brand & assets"
        description="Legal name, letterhead, and signature assets for document templates"
      />

      <div className="mx-6 mt-4 mb-3 flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto shrink-0">
        <Fact label="Assets" value={loading ? '—' : assets.length} />
        <Fact label="Logos" value={loading ? '—' : counts.logo ?? 0} />
        <Fact label="Signatures" value={loading ? '—' : counts.signature ?? 0} />
        <Fact label="Stamps / seals" value={loading ? '—' : (counts.stamp ?? 0) + (counts.seal ?? 0)} />
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
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Brand profile
            </h2>
            <p className="text-xs text-gray-500">
              Shown on rendered documents via {'{{brand.legalName}}'} and logo URLs.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Legal name</label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Acme Inc."
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Logo URL</label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Letterhead URL</label>
              <Input
                value={letterheadUrl}
                onChange={(e) => setLetterheadUrl(e.target.value)}
                placeholder="https://…"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" disabled={saving || loading} onClick={() => void handleSaveBrand()}>
              {saving ? 'Saving…' : 'Save brand'}
            </Button>
          </div>
          {brand?.logoUrl && (
            <div className="pt-2 border-t border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.logoUrl} alt="Logo preview" className="h-12 object-contain" />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Upload asset
            </h2>
            <p className="text-xs text-gray-500">
              Images or PDF. Upload requests a signed URL, stores the file, then registers the asset.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Kind</label>
              <select
                className={fieldClass}
                value={uploadKind}
                onChange={(e) => setUploadKind(e.target.value as DasAssetKind)}
              >
                {UPLOAD_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Label</label>
              <Input
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="Primary signature"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="text-sm text-gray-600"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            {uploading && <span className="text-xs text-gray-500">Uploading…</span>}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Assets
            </h2>
            <select
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
            >
              <option value="">All kinds</option>
              {DAS_ASSET_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : filteredAssets.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No assets yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredAssets.map((asset) => (
                <li key={asset.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {asset.publicUrl && asset.mimeType.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.publicUrl}
                        alt={asset.label}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase">{asset.kind}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{asset.label}</p>
                      <Badge color="primary">{kindLabel(asset.kind)}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{asset.fileName}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(asset.id)}
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
