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
    <ul className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const unread = conv.unreadCount > 0;
        const active = selectedId === conv.id;
        return (
        <li key={conv.id}>
          <button
            type="button"
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
              active
                ? 'bg-primary-50 border-l-[3px] border-l-primary-500'
                : unread
                  ? 'bg-primary-50/60 border-l-[3px] border-l-primary-500'
                  : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
            }`}
          >
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {conv.contactName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <span className="text-sm font-semibold text-gray-900 truncate">{conv.contactName}</span>
              <span className="text-[11px] text-gray-400 shrink-0">{formatTime(conv.lastMessageAt)}</span>
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
            </div>
            <p className="text-[11px] text-primary-600 mt-1 truncate font-medium">{conv.inboxName}</p>
              </div>
              {unread && (
                <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center self-start mt-1">
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </span>
              )}
            </div>
          </button>
        </li>
        );
      })}
    </ul>
  );
}
