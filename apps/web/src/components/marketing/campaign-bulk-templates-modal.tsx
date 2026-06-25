'use client';

import { useMemo, useState } from 'react';
import type { EmailTemplate } from '@/lib/api';
import {
  addDaysAtTime,
  newCampaignStepDraft,
  type CampaignStepDraft,
} from '@/lib/marketing/campaign-step-draft';
import { formatSendAtLabel } from '@/lib/marketing/automation-email-draft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
} from '@/lib/marketing/automation-email-draft';

type Props = {
  open: boolean;
  templates: EmailTemplate[];
  existingSteps: CampaignStepDraft[];
  timezone: string;
  locale: string;
  onClose: () => void;
  onConfirm: (newSteps: CampaignStepDraft[]) => void;
};

export function CampaignBulkTemplatesModal({
  open,
  templates,
  existingSteps,
  timezone,
  locale,
  onClose,
  onConfirm,
}: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [spacingDays, setSpacingDays] = useState(3);
  const [spacingHour, setSpacingHour] = useState(9);
  const [firstSendAt, setFirstSendAt] = useState(() => {
    const last = existingSteps[existingSteps.length - 1];
    if (last?.sendAt) {
      return addDaysAtTime(last.sendAt, spacingDays, spacingHour, 0);
    }
    return newCampaignStepDraft(0).sendAt;
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    );
  }, [search, templates]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTemplates = templates.filter((t) => selected.has(t.id));

  const handleConfirm = () => {
    const ordered = selectedTemplates;
    if (ordered.length === 0) return;

    const startOrder = existingSteps.length;
    let previous = firstSendAt;
    const newSteps: CampaignStepDraft[] = ordered.map((tpl, i) => {
      const sendAt =
        i === 0 ? firstSendAt : addDaysAtTime(previous, spacingDays, spacingHour, 0);
      previous = sendAt;
      return newCampaignStepDraft(startOrder + i, previous, {
        stepOrder: startOrder + i + 1,
        sendAt,
        subject: tpl.subject,
        htmlBody: tpl.htmlBody ?? '<p></p>',
        sourceTemplateId: tpl.id,
      });
    });

    onConfirm(newSteps);
    onClose();
    setSelected(new Set());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add multiple emails from templates</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="mt-3"
          />
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 px-2">
          {filtered.map((t) => (
            <li key={t.id}>
              <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  className="mt-1 rounded border-gray-300"
                />
                <span>
                  <span className="font-medium text-gray-900 block">{t.name}</span>
                  <span className="text-sm text-gray-500">{t.subject}</span>
                </span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-8 text-center text-sm text-gray-400">No templates match your search.</li>
          )}
        </ul>

        <div className="p-6 border-t border-gray-100 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Spacing between steps</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={spacingDays}
                  onChange={(e) => setSpacingDays(Number(e.target.value) || 3)}
                  className="w-16 h-9"
                />
                <span className="text-sm text-gray-600">days at</span>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={spacingHour}
                  onChange={(e) => setSpacingHour(Number(e.target.value) || 9)}
                  className="w-16 h-9"
                />
                <span className="text-sm text-gray-600">:00</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">First new step send at</label>
              <Input
                type="datetime-local"
                value={isoToDatetimeLocal(firstSendAt)}
                onChange={(e) => {
                  const iso = datetimeLocalToIso(e.target.value);
                  if (iso) setFirstSendAt(iso);
                }}
                className="h-9"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Creates {selected.size} new step{selected.size === 1 ? '' : 's'}
            {selected.size > 0 && (
              <>
                {' '}
                — first at {formatSendAtLabel(firstSendAt, locale, timezone)}
              </>
            )}
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={selected.size === 0} onClick={handleConfirm}>
              Add {selected.size} step{selected.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
