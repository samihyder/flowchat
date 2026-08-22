'use client';

import { useState } from 'react';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';

type Props = {
  title: string;
  description: string;
  urlLabel: string;
  urlPlaceholder: string;
  mergeTag: string;
  initialUrl: string;
  initialTemplate: string;
  onClose: () => void;
  onSave: (url: string, template: string) => Promise<void>;
};

/** Shared modal for the two single-value link settings: meeting link and portfolio link. */
export function LinkSettingModal({
  title,
  description,
  urlLabel,
  urlPlaceholder,
  mergeTag,
  initialUrl,
  initialTemplate,
  onClose,
  onSave,
}: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [template, setTemplate] = useState(initialTemplate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(url.trim(), template);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">{urlLabel}</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={urlPlaceholder}
              type="url"
              autoFocus
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary-border"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Link template <span className="font-normal text-gray-400">— supports {mergeTag}</span>
            </label>
            <EmailRichEditor value={template} onChange={setTemplate} minHeight="80px" />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
