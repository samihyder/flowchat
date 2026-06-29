'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ContactMessageMode } from '@/lib/marketing/campaign-step-draft';
import { Button } from '@/components/ui/button';
import { useModalFocus } from '@/components/marketing/ui/use-modal-focus';

const MODES: { value: ContactMessageMode; label: string; description: string }[] = [
  {
    value: 'latest_note',
    label: 'Latest CRM note',
    description: 'Uses the most recent note on the contact profile.',
  },
  {
    value: 'latest_inbound_chat',
    label: 'Latest inbound chat message',
    description: 'Uses the latest message the contact sent in chat.',
  },
  {
    value: 'latest_note_or_chat',
    label: 'Latest note or chat (recommended)',
    description: 'Falls back between notes and chat messages.',
  },
];

type PreviewContact = { contactId: string; name: string };

type Props = {
  open: boolean;
  accountId: string;
  token: string;
  stepOrder: number;
  currentMode?: ContactMessageMode;
  previewContacts: PreviewContact[];
  onClose: () => void;
  onSave: (mode: ContactMessageMode) => void;
};

export function CampaignMessageSourceModal({
  open,
  accountId,
  token,
  stepOrder,
  currentMode = 'latest_note_or_chat',
  previewContacts,
  onClose,
  onSave,
}: Props) {
  const [mode, setMode] = useState<ContactMessageMode>(currentMode);
  const [previewContactId, setPreviewContactId] = useState(
    previewContacts[0]?.contactId ?? ''
  );
  const [previewText, setPreviewText] = useState('');
  const [previewSource, setPreviewSource] = useState<'note' | 'chat' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const panelRef = useModalFocus(open, onClose);

  useEffect(() => {
    if (open) setMode(currentMode);
  }, [open, currentMode]);

  useEffect(() => {
    if (!open || !previewContactId || !token) {
      setPreviewText('');
      setPreviewSource(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    api.marketing
      .contactMessagePreview(accountId, previewContactId, mode, token)
      .then((res) => {
        if (cancelled) return;
        setPreviewText(res.text);
        setPreviewSource(res.source);
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewText('');
        setPreviewSource(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, accountId, token, previewContactId, mode]);

  if (!open) return null;

  const previewContact = previewContacts.find((c) => c.contactId === previewContactId);
  const sourceLabel =
    previewSource === 'note'
      ? 'CRM note'
      : previewSource === 'chat'
        ? 'inbound chat'
        : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div
        ref={panelRef}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-source-title"
      >
        <h2 id="message-source-title" className="text-lg font-semibold text-gray-900">
          Message source for {'{{contact_message}}'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">Email {stepOrder}</p>

        {previewContacts.length > 0 ? (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Preview contact
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
              value={previewContactId}
              onChange={(e) => setPreviewContactId(e.target.value)}
            >
              {previewContacts.map((c) => (
                <option key={c.contactId} value={c.contactId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Select recipients on step 1 to preview message resolution.
          </p>
        )}

        <fieldset className="mt-4 space-y-2">
          <legend className="text-xs font-medium text-gray-600 mb-2">
            Source mode (resolved per recipient at send)
          </legend>
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${
                mode === m.value ? 'border-primary-border bg-primary-surface' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="contact_message_mode"
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="mt-1"
              />
              <span>
                <span className="text-sm font-medium text-gray-900 block">{m.label}</span>
                <span className="text-xs text-gray-500">{m.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">
            Preview{sourceLabel ? ` · from ${sourceLabel}` : ''}
          </p>
          {previewLoading ? (
            <p className="text-sm text-gray-400 italic">Loading preview…</p>
          ) : previewContact && previewText ? (
            <p className="text-sm text-gray-700 italic">“{previewText}”</p>
          ) : previewContact ? (
            <p className="text-sm text-gray-500 italic">
              No content for this contact — token will be omitted at send.
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No content for preview — token will be omitted for contacts without data.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSave(mode)}>
            Save source mode
          </Button>
        </div>
      </div>
    </div>
  );
}
