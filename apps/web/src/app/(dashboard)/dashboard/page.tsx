'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { api, type Conversation } from '@/lib/api';
import { ConversationList } from '@/components/conversations/conversation-list';
import { ConversationThread } from '@/components/conversations/conversation-thread';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const inboxFilter = searchParams.get('inbox');
  const { token, accountId } = useAuthStore();
  const { lastMessageEvent } = useWsStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    try {
      const res = await api.conversations.list(accountId, token, {
        inboxId: inboxFilter ?? undefined,
        status: 'open',
      });
      setConversations(res.conversations);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [token, accountId, inboxFilter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!lastMessageEvent) return;
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === lastMessageEvent.conversationId);
      if (idx === -1) {
        fetchConversations();
        return prev;
      }
      const updated = [...prev];
      const conv = { ...updated[idx]! };
      conv.lastMessageAt = lastMessageEvent.message.createdAt;
      conv.lastMessagePreview = lastMessageEvent.message.content.slice(0, 200);
      if (lastMessageEvent.message.senderType === 'contact' && selectedId !== conv.id) {
        conv.unreadCount += 1;
      }
      updated.splice(idx, 1);
      updated.unshift(conv);
      return updated;
    });
  }, [lastMessageEvent, selectedId, fetchConversations]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 className="text-base font-semibold text-gray-900">Conversations</h1>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            loading={loading}
            onSelect={handleSelect}
          />
        </aside>

        <ConversationThread
          conversation={selected}
          onConversationUpdate={fetchConversations}
        />
      </div>
    </>
  );
}
