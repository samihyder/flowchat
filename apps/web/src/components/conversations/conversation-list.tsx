'use client';

import { type Conversation } from '@/lib/api';
import { ListSkeleton } from '@/components/ui/skeleton';

function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

type Props = {
  conversations: Conversation[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
};

export function ConversationList({ conversations, selectedId, loading, onSelect }: Props) {
  if (loading) return <ListSkeleton rows={6} />;

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary-500" fill="currentColor">
            <path d="M20 6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2v3l4-3h6a2 2 0 0 0 2-2V6z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-1">No conversations yet</p>
        <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">
          Embed the widget on your site from Settings → Inboxes to start receiving messages.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <button
            type="button"
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3.5 hover:bg-primary-50/50 transition-colors ${
              selectedId === conv.id ? 'bg-primary-50 border-l-[3px] border-primary-500' : 'border-l-[3px] border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">{conv.contactName}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatTime(conv.lastMessageAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {conv.priority && conv.priority !== 'medium' && (
                <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  {conv.priority}
                </span>
              )}
              {conv.assigneeName && (
                <span className="text-[10px] text-gray-500">→ {conv.assigneeName}</span>
              )}
              {conv.labels?.slice(0, 2).map((l) => (
                <span
                  key={l.id}
                  className="text-[10px] px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 truncate">
                {conv.lastMessagePreview || 'No messages yet'}
              </p>
              {conv.unreadCount > 0 && (
                <span className="shrink-0 text-xs font-semibold bg-primary-500 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {conv.unreadCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-accent-600 mt-1 truncate font-medium">{conv.inboxName}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
