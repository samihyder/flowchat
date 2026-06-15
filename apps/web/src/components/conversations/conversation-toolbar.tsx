'use client';

import { useEffect, useState } from 'react';
import { api, type Conversation, type Label } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { LabelPill, PriorityBadge, StatusBadge } from '@/components/conversations/conversation-badges';

type AgentOption = { userId: string; name: string; membershipStatus: string };

type Props = {
  conversation: Conversation;
  onUpdated: () => void;
  onResolve: () => void;
  onExport: () => void;
};

export function ConversationToolbar({ conversation, onUpdated, onResolve, onExport }: Props) {
  const { token, accountId } = useAuthStore();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [saving, setSaving] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.agents.list(accountId, token).then((r) => setAgents(r.agents.filter((a) => a.membershipStatus === 'active'))),
      api.labels.list(accountId, token).then((r) => setLabels(r.labels)),
    ]);
  }, [token, accountId]);

  const update = async (body: Parameters<typeof api.conversations.update>[2]) => {
    if (!token || !accountId) return;
    setSaving(true);
    try {
      await api.conversations.update(accountId, conversation.id, body, token);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const snooze = () => {
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    void update({ status: 'snoozed', snoozedUntil: until });
  };

  const selectedLabelIds = conversation.labels?.map((l) => l.id) ?? [];

  return (
    <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex flex-wrap items-center gap-2 shrink-0">
      <StatusBadge status={conversation.status} />
      <PriorityBadge priority={conversation.priority} />
      {conversation.labels?.map((l) => (
        <LabelPill key={l.id} name={l.name} color={l.color} />
      ))}

      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving}
          onClick={() => setLabelPickerOpen((o) => !o)}
        >
          + Label
        </Button>
        {labelPickerOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px]">
            {labels.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-1">No labels</p>
            ) : (
              labels.map((label) => {
                const active = selectedLabelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      const next = active
                        ? selectedLabelIds.filter((id) => id !== label.id)
                        : [...selectedLabelIds, label.id];
                      void update({ labelIds: next });
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gray-50 ${active ? 'font-medium' : ''}`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={snooze}>
          ⏰ Snooze
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled
          title="Conversation merge coming soon"
        >
          🔀 Merge
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onExport}>
          📋 Export
        </Button>
        {conversation.status === 'open' && (
          <Button type="button" size="sm" onClick={onResolve}>
            ✓ Resolve
          </Button>
        )}
      </div>

      {/* Assignment controls — compact row below on narrow screens */}
      <div className="w-full flex flex-wrap gap-2 pt-1 border-t border-gray-100 mt-1 lg:border-0 lg:mt-0 lg:pt-0 lg:w-auto">
        <select
          value={conversation.assigneeId ?? ''}
          disabled={saving}
          onChange={(e) => update({ assigneeId: e.target.value || null })}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[140px]"
          aria-label="Assignee"
        >
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.userId} value={a.userId}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={conversation.priority ?? 'medium'}
          disabled={saving}
          onChange={(e) => update({ priority: e.target.value as Conversation['priority'] })}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white capitalize"
          aria-label="Priority"
        >
          {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={conversation.status}
          disabled={saving}
          onChange={(e) => update({ status: e.target.value as Conversation['status'] })}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white capitalize"
          aria-label="Status"
        >
          {(['open', 'pending', 'resolved', 'snoozed'] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
