'use client';

import { type Conversation } from '@/lib/api';

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
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading conversations…
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
          <span className="text-xl">💬</span>
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">No conversations yet</p>
        <p className="text-xs text-gray-500 max-w-[200px]">
          Embed the widget on your site to start receiving messages.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <button
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
              selectedId === conv.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">{conv.contactName}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatTime(conv.lastMessageAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 truncate">
                {conv.lastMessagePreview || 'No messages yet'}
              </p>
              {conv.unreadCount > 0 && (
                <span className="shrink-0 text-xs font-semibold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {conv.unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">{conv.inboxName}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
