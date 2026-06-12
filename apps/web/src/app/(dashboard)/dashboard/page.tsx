'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { api, type Conversation, type Label } from '@/lib/api';
import { ConversationList } from '@/components/conversations/conversation-list';
import { ConversationSearch } from '@/components/conversations/conversation-search';
import { ConversationThread } from '@/components/conversations/conversation-thread';
import {
  ConversationFilterBar,
  type ConversationFilters,
} from '@/components/conversations/conversation-filter-bar';
import { PageHeader } from '@/components/ui/page-header';

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const inboxFilter = searchParams.get('inbox');
  const conversationParam = searchParams.get('conversation');
  const { token, accountId } = useAuthStore();
  const { lastMessageEvent, messageEventSeq, connected } = useWsStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ConversationFilters>({
    status: 'open',
    priority: '',
    labelId: '',
    from: '',
    to: '',
  });

  useEffect(() => {
    if (!token || !accountId) return;
    api.labels.list(accountId, token).then((r) => setLabels(r.labels)).catch(() => {});
  }, [token, accountId]);

  const fetchConversations = useCallback(async () => {
    if (!token || !accountId) return;
    setLoading(true);
    try {
      const res = await api.conversations.list(accountId, token, {
        inboxId: inboxFilter ?? undefined,
        status: filters.status,
        priority: filters.priority || undefined,
        labelId: filters.labelId || undefined,
        from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
      });
      setConversations(res.conversations);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [token, accountId, inboxFilter, filters]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (conversationParam) setSelectedId(conversationParam);
  }, [conversationParam]);

  useEffect(() => {
    if (!token || !accountId || connected) return;
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, [token, accountId, connected, fetchConversations]);

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
  }, [messageEventSeq, lastMessageEvent, selectedId, fetchConversations]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    if (token && accountId) {
      api.conversations.get(accountId, id, token).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Conversations"
        description={inboxFilter ? 'Filtered by inbox' : 'Manage live chats'}
      />

      <div className="flex-1 flex min-h-0">
        <aside
          className={`w-full md:w-80 lg:w-96 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0 ${
            selectedId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ConversationFilterBar filters={filters} labels={labels} onChange={setFilters} />
          {token && accountId && (
            <ConversationSearch accountId={accountId} token={token} onSelect={handleSelect} />
          )}
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            loading={loading}
            onSelect={handleSelect}
          />
        </aside>

        <div className={`flex-1 min-w-0 flex flex-col ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-primary-600 border-b border-gray-200 bg-white"
            >
              ← Back to list
            </button>
          )}
          <ConversationThread
            conversation={selected}
            onConversationUpdate={fetchConversations}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading conversations…</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}
