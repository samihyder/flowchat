'use client';

import { useState } from 'react';
import { parseCsvRaw, guessColumnMapping, importErrorsToCsv, type ColumnMapping, type CsvImportError } from '@/lib/csv-import-utils';
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

export type ImportProgress = {
  totalRows: number;
  processedRows: number;
  importedCount: number;
  skippedCount: number;
  errors: CsvImportError[];
  done: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (file: File, mapping: ColumnMapping, upsertByEmail: boolean) => Promise<void>;
  progress: ImportProgress | null;
  customAttrKeys?: { key: string; label: string }[];
};

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
        done ? 'bg-green-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
      }`}
    >
      {done ? '✓' : n}
    </span>
  );
}

export function ContactImportModal({ open, onClose, onImport, progress, customAttrKeys = [] }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [upsertByEmail, setUpsertByEmail] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const step = progress ? 3 : headers.length > 0 ? 2 : 1;

  const sampleFor = (header: string) =>
    sampleRows
      .slice(0, 2)
      .map((r) => r[headers.indexOf(header)] ?? '')
      .filter(Boolean)
      .join(', ');

  const handleFile = async (f: File) => {
    setFile(f);
    setError('');
    const text = await f.text();
    const { headers: h, rows } = parseCsvRaw(text);
    setHeaders(h);
    setSampleRows(rows);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setHeaders([]);
    setSampleRows([]);
    setMapping({});
    setError('');
    onClose();
  };

  const downloadErrors = () => {
    if (!progress || progress.errors.length === 0) return;
    const csv = importErrorsToCsv(progress.errors);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = progress && progress.totalRows > 0 ? Math.round((progress.processedRows / progress.totalRows) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Import contacts from CSV</h2>
            <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><StepDot n={1} active={step === 1} done={step > 1} /> Upload</span>
            <span className="w-5 h-px bg-gray-200" />
            <span className="flex items-center gap-1.5"><StepDot n={2} active={step === 2} done={step > 2} /> Map columns</span>
            <span className="w-5 h-px bg-gray-200" />
            <span className="flex items-center gap-1.5"><StepDot n={3} active={step === 3} done={Boolean(progress?.done)} /> Result</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 1 && (
            <div>
              <label className="block border-2 border-dashed border-primary-200 rounded-xl p-8 text-center bg-slate-50 cursor-pointer hover:border-primary-300 transition-colors">
                <p className="text-3xl mb-2" aria-hidden>📂</p>
                <p className="text-sm font-semibold text-gray-700">Drop your CSV file here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                CSV columns → FlowChat fields. Unmapped columns are ignored unless mapped to a custom attribute.
              </p>
              <div className="grid grid-cols-[140px_1fr_1fr_90px] gap-3 px-1 pb-2 border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                <span>Field</span>
                <span>Sample value</span>
                <span>Maps to CSV column</span>
                <span>Required</span>
              </div>
              {STANDARD_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-[140px_1fr_1fr_90px] gap-3 items-center px-1">
                  <span className="text-sm text-gray-700 truncate">{field.label}</span>
                  <span className="text-xs text-gray-400 truncate">
                    {(() => {
                      const mapped = mapping[field.key];
                      return mapped ? sampleFor(mapped) || '—' : '—';
                    })()}
                  </span>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="">— skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {'required' in field && field.required ? (
                    <span className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5 text-center">
                      Required
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {customAttrKeys.map((attr) => (
                <div key={attr.key} className="grid grid-cols-[140px_1fr_1fr_90px] gap-3 items-center px-1">
                  <span className="text-sm text-gray-700 truncate" title={attr.label}>
                    {attr.label}
                  </span>
                  <span className="text-xs text-gray-400 truncate">
                    {(() => {
                      const mapped = mapping[`custom:${attr.key}`];
                      return mapped ? sampleFor(mapped) || '—' : '—';
                    })()}
                  </span>
                  <select
                    value={mapping[`custom:${attr.key}`] ?? ''}
                    onChange={(e) => setMapping({ ...mapping, [`custom:${attr.key}`]: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="">— skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span />
                </div>
              ))}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <label htmlFor="import-dup-strategy" className="text-sm text-gray-600 font-medium">
                  On duplicate email
                </label>
                <select
                  id="import-dup-strategy"
                  value={upsertByEmail ? 'update' : 'create'}
                  onChange={(e) => setUpsertByEmail(e.target.value === 'update')}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <option value="update">Update existing contact</option>
                  <option value="create">Create new contact (may duplicate)</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && progress && (
            <div className="space-y-4">
              <div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full transition-all"
                    style={{ width: `${progress.done ? 100 : pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {progress.done
                    ? 'Import finished'
                    : `Importing… ${progress.processedRows}/${progress.totalRows} rows`}
                </p>
              </div>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex-1 text-center py-3 border-r border-gray-100">
                  <p className="text-lg font-bold text-green-700">{progress.importedCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Imported</p>
                </div>
                <div className="flex-1 text-center py-3 border-r border-gray-100">
                  <p className="text-lg font-bold text-gray-700">{progress.skippedCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Skipped</p>
                </div>
                <div className="flex-1 text-center py-3">
                  <p className="text-lg font-bold text-red-700">{progress.errors.length}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Errors</p>
                </div>
              </div>
              {progress.errors.length > 0 && (
                <Button type="button" variant="secondary" size="sm" onClick={downloadErrors}>
                  ⬇ Download error report ({progress.errors.length} row{progress.errors.length === 1 ? '' : 's'})
                </Button>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          {step === 3 ? (
            <Button type="button" onClick={handleClose} disabled={!progress?.done}>
              {progress?.done ? 'Done' : 'Importing…'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!file || importing} onClick={() => void handleSubmit()}>
                {importing ? 'Starting…' : step === 1 ? 'Continue' : 'Start import'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
