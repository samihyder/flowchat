'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type ChatMessage, type Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type Props = {
  conversation: Conversation | null;
  onConversationUpdate?: () => void;
};

export function ConversationThread({ conversation, onConversationUpdate }: Props) {
  const { token, accountId, user } = useAuthStore();
  const { subscribeConversation, lastMessageEvent, connected } = useWsStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

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

    if (connected) subscribeConversation(conversation.id);
  }, [conversation?.id, token, accountId, connected, subscribeConversation]);

  useEffect(() => {
    if (!lastMessageEvent || !conversation) return;
    if (lastMessageEvent.conversationId !== conversation.id) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === lastMessageEvent.message.id)) return prev;
      return [...prev, lastMessageEvent.message];
    });
  }, [lastMessageEvent, conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !token || !accountId || !draft.trim() || sending) return;

    const content = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const res = await api.conversations.sendMessage(accountId, conversation.id, content, token);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
      onConversationUpdate?.();
    } catch {
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
      <header className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{conversation.contactName}</h2>
          <p className="text-xs text-gray-500 truncate">
            {conversation.contactEmail || conversation.inboxName}
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
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
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
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isAgent ? 'text-indigo-200' : 'text-gray-400'
                    }`}
                  >
                    {isOwn ? 'You' : isAgent ? 'Agent' : conversation.contactName} ·{' '}
                    {formatMessageTime(msg.createdAt)}
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
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your reply…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
