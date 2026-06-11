'use client';

import { useEffect, useState } from 'react';
import { api, type Conversation, type Label } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type AgentOption = { userId: string; name: string; membershipStatus: string };

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

type Props = {
  conversation: Conversation;
  onUpdated: () => void;
};

export function ConversationActions({ conversation, onUpdated }: Props) {
  const { token, accountId } = useAuthStore();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [saving, setSaving] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState('');

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

  const snooze = (hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    void update({ status: 'snoozed', snoozedUntil: until });
  };

  const selectedLabelIds = conversation.labels?.map((l) => l.id) ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50 text-xs">
      <select
        value={conversation.assigneeId ?? ''}
        disabled={saving}
        onChange={(e) => update({ assigneeId: e.target.value || null })}
        className="border border-gray-200 rounded-md px-2 py-1 bg-white max-w-[140px]"
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
        onChange={(e) =>
          update({ priority: e.target.value as (typeof PRIORITIES)[number] })
        }
        className="border border-gray-200 rounded-md px-2 py-1 bg-white"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={conversation.status}
        disabled={saving}
        onChange={(e) =>
          update({ status: e.target.value as Conversation['status'] })
        }
        className="border border-gray-200 rounded-md px-2 py-1 bg-white capitalize"
      >
        {['open', 'pending', 'resolved', 'snoozed'].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="flex gap-1">
        {labels.map((label) => {
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
              className={`px-2 py-0.5 rounded-full border ${
                active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
              }`}
              style={active ? { backgroundColor: label.color } : undefined}
            >
              {label.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => snooze(1)}
        className="px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
      >
        Snooze 1h
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => snooze(24)}
        className="px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
      >
        Snooze 1d
      </button>
      <input
        type="datetime-local"
        value={snoozeUntil}
        onChange={(e) => setSnoozeUntil(e.target.value)}
        className="border border-gray-200 rounded-md px-2 py-1 bg-white"
      />
      <button
        type="button"
        disabled={saving || !snoozeUntil}
        onClick={() => {
          void update({ status: 'snoozed', snoozedUntil: new Date(snoozeUntil).toISOString() });
          setSnoozeUntil('');
        }}
        className="px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
      >
        Snooze until
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          if (confirm('Block this visitor from starting new chats?')) {
            void update({ blockContact: true });
          }
        }}
        className="px-2 py-1 rounded-md border border-red-200 text-red-600 bg-white hover:bg-red-50"
      >
        Block
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          if (confirm('Block this visitor IP from this inbox?')) {
            void update({ blockIp: true });
          }
        }}
        className="px-2 py-1 rounded-md border border-red-200 text-red-600 bg-white hover:bg-red-50"
      >
        Block IP
      </button>
    </div>
  );
}
