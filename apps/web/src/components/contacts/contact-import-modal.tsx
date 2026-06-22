'use client';

import { useState } from 'react';
import { parseCsvRaw, guessColumnMapping, type ColumnMapping } from '@/lib/csv-import-utils';
import { Button } from '@/components/ui/button';

const STANDARD_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'name', label: 'Full name (optional if First + Last mapped)' },
  { key: 'phone', label: 'Phone' },
  { key: 'type', label: 'Type' },
  { key: 'externalId', label: 'External ID / Record ID' },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (file: File, mapping: ColumnMapping, upsertByEmail: boolean) => Promise<void>;
  customAttrKeys?: { key: string; label: string }[];
};

export function ContactImportModal({ open, onClose, onImport, customAttrKeys = [] }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [upsertByEmail, setUpsertByEmail] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleFile = async (f: File) => {
    setFile(f);
    setError('');
    const text = await f.text();
    const { headers: h } = parseCsvRaw(text);
    setHeaders(h);
    const guessed = guessColumnMapping(h, customAttrKeys);
    const auto: Record<string, string> = {};
    if (guessed.firstName) auto.firstName = guessed.firstName;
    if (guessed.lastName) auto.lastName = guessed.lastName;
    if (guessed.name) auto.name = guessed.name;
    if (guessed.email) auto.email = guessed.email;
    if (guessed.phone) auto.phone = guessed.phone;
    if (guessed.type) auto.type = guessed.type;
    if (guessed.externalId) auto.externalId = guessed.externalId;
    for (const [key, col] of Object.entries(guessed.custom ?? {})) {
      auto[`custom:${key}`] = col;
    }
    setMapping(auto);
  };

  const handleSubmit = async () => {
    const hasName = Boolean(mapping.name);
    const hasFirstLast = Boolean(mapping.firstName && mapping.lastName);
    if (!file || (!hasName && !hasFirstLast)) {
      setError('Map First Name + Last Name (or Full name) and Email.');
      return;
    }
    if (!mapping.email) {
      setError('Email column is required.');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const columnMapping: ColumnMapping = {
        name: mapping.name,
        firstName: mapping.firstName,
        lastName: mapping.lastName,
        email: mapping.email,
        phone: mapping.phone,
        type: mapping.type,
        externalId: mapping.externalId,
        custom: {},
      };
      for (const [k, v] of Object.entries(mapping)) {
        if (k.startsWith('custom:') && v) {
          columnMapping.custom![k.slice(7)] = v;
        }
      }
      await onImport(file, columnMapping, upsertByEmail);
      onClose();
      setFile(null);
      setHeaders([]);
      setMapping({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Import contacts</h2>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="text-sm"
        />
        {headers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Map CSV columns to contact fields. Extra columns are ignored unless mapped to a custom attribute
              defined in Settings → CRM.
            </p>
            {STANDARD_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <span className="text-sm w-36 shrink-0">
                  {field.label}
                  {'required' in field && field.required ? ' *' : ''}
                </span>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <option value="">— skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {customAttrKeys.map((attr) => (
              <div key={attr.key} className="flex items-center gap-3">
                <span className="text-sm w-28 shrink-0 truncate" title={attr.label}>
                  {attr.label}
                </span>
                <select
                  value={mapping[`custom:${attr.key}`] ?? ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, [`custom:${attr.key}`]: e.target.value })
                  }
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <option value="">— skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={upsertByEmail}
                onChange={(e) => setUpsertByEmail(e.target.checked)}
              />
              Update existing contacts when email matches
            </label>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!file || importing} onClick={() => void handleSubmit()}>
            {importing ? 'Starting…' : 'Start import'}
          </Button>
        </div>
      </div>
    </div>
  );
}
