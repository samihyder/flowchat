'use client';

import { useState } from 'react';
import { api, type MarketingEmailSignature } from '@/lib/api';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';
import { DEFAULT_SIGNATURE_HTML } from '@/lib/marketing/signatures';

type Props = {
  accountId: string;
  token: string;
  signatures: MarketingEmailSignature[];
  onClose: () => void;
  onChange: (signatures: MarketingEmailSignature[]) => void;
};

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sig_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function SignatureManagerModal({ accountId, token, signatures, onClose, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const persist = async (next: MarketingEmailSignature[]) => {
    setBusy(true);
    setError('');
    try {
      await api.account.update(accountId, { settings: { marketingEmailSignatures: next } }, token);
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signatures');
    } finally {
      setBusy(false);
    }
  };

  const startCreate = () => {
    setEditingId('__new__');
    setName(signatures.length === 0 ? 'Default' : '');
    setHtml(DEFAULT_SIGNATURE_HTML);
  };

  const startEdit = (sig: MarketingEmailSignature) => {
    setEditingId(sig.id);
    setName(sig.name);
    setHtml(sig.html);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setHtml('');
  };

  const saveEdit = async () => {
    if (!name.trim()) return;
    let next: MarketingEmailSignature[];
    if (editingId === '__new__') {
      const makeDefault = signatures.length === 0;
      next = [
        ...signatures,
        { id: newId(), name: name.trim(), html, isDefault: makeDefault },
      ];
    } else {
      next = signatures.map((s) => (s.id === editingId ? { ...s, name: name.trim(), html } : s));
    }
    await persist(next);
    cancelEdit();
  };

  const setDefault = async (id: string) => {
    const next = signatures.map((s) => ({ ...s, isDefault: s.id === id }));
    await persist(next);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this signature?')) return;
    const wasDefault = signatures.find((s) => s.id === id)?.isDefault;
    let next = signatures.filter((s) => s.id !== id);
    if (wasDefault && next.length > 0 && !next.some((s) => s.isDefault)) {
      next = next.map((s, i) => (i === 0 ? { ...s, isDefault: true } : s));
    }
    await persist(next);
    if (editingId === id) cancelEdit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Email signatures</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Create multiple signatures — the default one is used automatically on every send.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none p-1 -m-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {signatures.length === 0 && editingId === null && (
            <p className="text-sm text-gray-400 py-2">No signatures yet — create your first one.</p>
          )}

          {signatures.map((sig) => (
            <div key={sig.id} className="border border-gray-200 rounded-lg p-3">
              {editingId === sig.id ? (
                <div className="space-y-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Signature name"
                    className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
                  />
                  <EmailRichEditor value={html} onChange={setHtml} minHeight="120px" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || !name.trim()}
                      onClick={() => void saveEdit()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{sig.name}</p>
                      {sig.isDefault && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {sig.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Empty'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    {!sig.isDefault && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setDefault(sig.id)}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(sig)}
                      className="text-xs font-semibold text-gray-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(sig.id)}
                      className="text-xs text-gray-400 hover:text-status-danger-text disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editingId === '__new__' && (
            <div className="border border-primary-200 rounded-lg p-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Signature name"
                autoFocus
                className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
              />
              <EmailRichEditor value={html} onChange={setHtml} minHeight="120px" />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !name.trim()}
                  onClick={() => void saveEdit()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 text-white disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {editingId === null && (
            <button
              type="button"
              onClick={startCreate}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm font-semibold text-gray-500 hover:border-primary-border hover:text-primary transition-colors"
            >
              + New signature
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
