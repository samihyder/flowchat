'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ChatMessage, type Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { ConversationActions } from '@/components/conversations/conversation-actions';

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

type Props = {
  conversation: Conversation | null;
  onConversationUpdate?: () => void;
};

export function ConversationThread({ conversation, onConversationUpdate }: Props) {
  const { token, accountId, user } = useAuthStore();
  const { subscribeConversation, lastMessageEvent, messageEventSeq, connected, sendTyping, typingByConversation } =
    useWsStore();
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastEventSeq = useRef(0);

  const fetchMessages = useCallback(async () => {
    if (!conversation || !token || !accountId) return;
    try {
      const res = await api.conversations.listMessages(accountId, conversation.id, token);
      setMessages((prev) => mergeMessages(prev, res.messages));
    } catch { /* keep existing */ }
  }, [conversation, token, accountId]);

  // Initial load when conversation changes
  useEffect(() => {
    if (!conversation || !token || !accountId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    api.conversations
      .listMessages(accountId, conversation.id, token)
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conversation?.id, token, accountId]);

  // WS subscription — no refetch on reconnect
  useEffect(() => {
    if (!conversation || !connected) return;
    subscribeConversation(conversation.id);
  }, [conversation?.id, connected, subscribeConversation]);

  // Append live messages from WebSocket
  useEffect(() => {
    if (!lastMessageEvent || !conversation) return;
    if (messageEventSeq === lastEventSeq.current) return;
    lastEventSeq.current = messageEventSeq;
    if (lastMessageEvent.conversationId !== conversation.id) return;
    setMessages((prev) => mergeMessages(prev, [lastMessageEvent.message]));
  }, [messageEventSeq, lastMessageEvent, conversation?.id]);

  // Polling fallback — fast when WS down, light backup when connected
  useEffect(() => {
    if (!conversation || !token || !accountId) return;
    const ms = connected ? 5000 : 2500;
    const interval = setInterval(fetchMessages, ms);
    return () => clearInterval(interval);
  }, [conversation?.id, token, accountId, connected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !token || !accountId || !draft.trim() || sending) return;

    const content = draft.trim();
    const tempId = `pending-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId: conversation.id,
      content,
      senderType: 'agent',
      senderId: user?.id ?? null,
      createdAt: new Date().toISOString(),
    };

    setDraft('');
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.conversations.sendMessage(accountId, conversation.id, content, token);
      setMessages((prev) =>
        mergeMessages(
          prev.filter((m) => m.id !== tempId),
          [res.message]
        )
      );
      onConversationUpdate?.();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!conversation || !token || !accountId) return;
    try {
      await api.conversations.updateStatus(accountId, conversation.id, 'resolved', token);
      onConversationUpdate?.();
    } catch { /* ignore */ }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Select a conversation</h2>
          <p className="text-sm text-gray-500">Choose a thread from the list to start replying.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ConversationActions conversation={conversation} onUpdated={() => onConversationUpdate?.()} />

      <header className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{conversation.contactName}</h2>
          <p className="text-xs text-gray-500 truncate">
            {conversation.contactEmail || conversation.inboxName}
            {!connected && <span className="text-amber-600 ml-2">· reconnecting…</span>}
          </p>
        </div>
        {conversation.status === 'open' && (
          <button
            onClick={handleResolve}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            Resolve
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {conversation && typingByConversation[conversation.id] && (
          <p className="text-xs text-gray-400 italic px-1">Visitor is typing…</p>
        )}
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const isPending = msg.id.startsWith('pending-');
            const isAgent = msg.senderType === 'agent';
            const isOwn = isAgent && msg.senderId === user?.id;
            const isSystem = msg.senderType === 'system';

            if (isSystem) {
              return (
                <p key={msg.id} className="text-xs text-center text-gray-400 py-1">
                  {msg.content}
                </p>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isAgent
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  } ${isPending ? 'opacity-70' : ''}`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isAgent ? 'text-primary-200' : 'text-gray-400'
                    }`}
                  >
                    {isOwn ? 'You' : isAgent ? 'Agent' : conversation.contactName} ·{' '}
                    {isPending ? 'Sending…' : formatMessageTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {conversation.status === 'open' && (
        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white flex gap-2 shrink-0">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (conversation && connected) {
                sendTyping(conversation.id);
                if (typingTimeout.current) clearTimeout(typingTimeout.current);
                typingTimeout.current = setTimeout(() => {}, 2000);
              }
            }}
            placeholder="Type your reply…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
