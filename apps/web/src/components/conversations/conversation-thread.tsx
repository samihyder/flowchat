'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ChatMessage, type CannedResponse, type Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { ConversationActions } from '@/components/conversations/conversation-actions';
import { VisitorContextSidebar } from '@/components/conversations/visitor-context-sidebar';

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
  const {
    subscribeConversation,
    lastMessageEvent,
    messageEventSeq,
    connected,
    sendTyping,
    typingByConversation,
    viewersByConversation,
  } = useWsStore();
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [composerMode, setComposerMode] = useState<'reply' | 'note'>('reply');
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastEventSeq = useRef(0);

  const viewers = conversation ? viewersByConversation[conversation.id] ?? [] : [];
  const otherViewers = viewers.filter((v) => v.userId !== user?.id);

  const fetchMessages = useCallback(async () => {
    if (!conversation || !token || !accountId) return;
    try {
      const res = await api.conversations.listMessages(accountId, conversation.id, token);
      setMessages((prev) => mergeMessages(prev, res.messages));
      setNextCursor(res.nextCursor);
    } catch { /* keep existing */ }
  }, [conversation, token, accountId]);

  useEffect(() => {
    if (!conversation || !token || !accountId) {
      setMessages([]);
      setNextCursor(null);
      return;
    }

    setLoading(true);
    api.conversations
      .listMessages(accountId, conversation.id, token)
      .then((res) => {
        setMessages(res.messages);
        setNextCursor(res.nextCursor);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conversation?.id, token, accountId]);

  useEffect(() => {
    if (!conversation || !connected) return;
    subscribeConversation(conversation.id, user?.name);
  }, [conversation?.id, connected, subscribeConversation, user?.name]);

  useEffect(() => {
    if (!lastMessageEvent || !conversation) return;
    if (messageEventSeq === lastEventSeq.current) return;
    lastEventSeq.current = messageEventSeq;
    if (lastMessageEvent.conversationId !== conversation.id) return;
    setMessages((prev) => mergeMessages(prev, [lastMessageEvent.message as ChatMessage]));
  }, [messageEventSeq, lastMessageEvent, conversation?.id]);

  useEffect(() => {
    if (!conversation || !token || !accountId) return;
    const ms = connected ? 5000 : 2500;
    const interval = setInterval(fetchMessages, ms);
    return () => clearInterval(interval);
  }, [conversation?.id, token, accountId, connected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const loadOlder = async () => {
    if (!conversation || !token || !accountId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.conversations.listMessages(accountId, conversation.id, token, {
        before: nextCursor,
      });
      setMessages((prev) => mergeMessages(res.messages, prev));
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const insertCanned = (content: string) => {
    setDraft(content);
    setCannedOpen(false);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (value.startsWith('/') && accountId && token) {
      const q = value.slice(1).split(' ')[0] ?? '';
      api.cannedResponses
        .list(accountId, token, q)
        .then((r) => {
          setCanned(r.responses);
          setCannedOpen(r.responses.length > 0);
        })
        .catch(() => setCannedOpen(false));
    } else {
      setCannedOpen(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !token || !accountId || !draft.trim() || sending) return;

    const content = draft.trim();
    const clientMessageId = crypto.randomUUID();
    const tempId = `pending-${clientMessageId}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId: conversation.id,
      content,
      senderType: 'agent',
      senderId: user?.id ?? null,
      isPrivate: composerMode === 'note',
      createdAt: new Date().toISOString(),
    };

    setDraft('');
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.conversations.sendMessage(
        accountId,
        conversation.id,
        { content, isPrivate: composerMode === 'note', clientMessageId },
        token
      );
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

  const handleFile = async (file: File) => {
    if (!conversation || !token || !accountId || sending) return;
    setSending(true);
    try {
      const { uploadUrl, publicUrl, storageKey } = await api.conversations.attachmentUploadUrl(
        accountId,
        conversation.id,
        { filename: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size },
        token
      );
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      const res = await api.conversations.sendMessage(
        accountId,
        conversation.id,
        {
          content: file.type.startsWith('image/') ? '📷 Image' : `📎 ${file.name}`,
          clientMessageId: crypto.randomUUID(),
          attachments: [
            {
              storageKey,
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
              publicUrl,
            },
          ],
        },
        token
      );
      setMessages((prev) => mergeMessages(prev, [res.message]));
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const saveEdit = async (messageId: string) => {
    if (!conversation || !token || !accountId || !editDraft.trim()) return;
    try {
      const res = await api.conversations.editMessage(
        accountId,
        conversation.id,
        messageId,
        editDraft.trim(),
        token
      );
      setMessages((prev) => mergeMessages(prev, [res.message]));
      setEditingId(null);
    } catch { /* ignore */ }
  };

  const removeMessage = async (messageId: string) => {
    if (!conversation || !token || !accountId) return;
    try {
      const res = await api.conversations.deleteMessage(
        accountId,
        conversation.id,
        messageId,
        token
      );
      setMessages((prev) => mergeMessages(prev, [res.message]));
    } catch { /* ignore */ }
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
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 flex flex-col min-w-0">
        <ConversationActions conversation={conversation} onUpdated={() => onConversationUpdate?.()} />

        <header className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{conversation.contactName}</h2>
            <p className="text-xs text-gray-500 truncate">
              {conversation.contactEmail || conversation.inboxName}
              {!connected && <span className="text-amber-600 ml-2">· reconnecting…</span>}
              {otherViewers.length > 0 && (
                <span className="text-amber-700 ml-2">
                  · {otherViewers.map((v) => v.userName).join(', ')} viewing
                </span>
              )}
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
          {nextCursor && (
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              className="w-full text-xs text-primary-600 py-2"
            >
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </button>
          )}
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
              const isNote = msg.isPrivate;

              if (isSystem) {
                return (
                  <p key={msg.id} className="text-xs text-center text-gray-400 py-1">
                    {msg.content}
                  </p>
                );
              }

              const canEdit =
                isOwn &&
                !msg.deletedAt &&
                !isNote &&
                Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000;

              return (
                <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isNote
                        ? 'bg-amber-50 border border-amber-200 text-amber-950 rounded-br-md'
                        : isAgent
                          ? 'bg-primary-500 text-white rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                    } ${isPending ? 'opacity-70' : ''}`}
                  >
                    {isNote && (
                      <p className="text-[10px] font-semibold uppercase text-amber-600 mb-1">Private note</p>
                    )}
                    {editingId === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          className="w-full text-gray-900 text-sm rounded border p-2"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveEdit(msg.id)} className="text-xs underline">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-xs underline">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{msg.content}</p>
                        {msg.attachments?.map((a) =>
                          a.contentType.startsWith('image/') && a.publicUrl ? (
                            <img
                              key={a.id}
                              src={a.publicUrl}
                              alt={a.filename}
                              className="mt-2 max-w-full rounded-lg"
                            />
                          ) : a.publicUrl ? (
                            <a
                              key={a.id}
                              href={a.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block mt-2 text-xs underline ${isAgent && !isNote ? 'text-primary-100' : 'text-primary-600'}`}
                            >
                              {a.filename}
                            </a>
                          ) : null
                        )}
                      </>
                    )}
                    <p
                      className={`text-[10px] mt-1 flex items-center gap-2 ${
                        isAgent && !isNote ? 'text-primary-200' : 'text-gray-400'
                      }`}
                    >
                      <span>
                        {isOwn ? 'You' : isAgent ? 'Agent' : conversation.contactName} ·{' '}
                        {isPending ? 'Sending…' : formatMessageTime(msg.createdAt)}
                        {msg.editedAt && ' · edited'}
                      </span>
                      {msg.readAt && isOwn && !isNote && <span title="Read">✓✓</span>}
                      {canEdit && editingId !== msg.id && (
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditDraft(msg.content);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {isOwn && !msg.deletedAt && !isNote && (
                        <button type="button" className="underline" onClick={() => removeMessage(msg.id)}>
                          Delete
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {conversation.status === 'open' && (
          <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white shrink-0">
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setComposerMode('reply')}
                className={`text-xs px-2 py-1 rounded ${composerMode === 'reply' ? 'bg-primary-100 text-primary-700' : 'text-gray-500'}`}
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => setComposerMode('note')}
                className={`text-xs px-2 py-1 rounded ${composerMode === 'note' ? 'bg-amber-100 text-amber-800' : 'text-gray-500'}`}
              >
                Private note
              </button>
            </div>
            {cannedOpen && (
              <ul className="mb-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                {canned.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => insertCanned(c.content)}
                    >
                      <span className="font-mono text-primary-600">/{c.shortcut}</span> {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-2 text-gray-500 border border-gray-200 rounded-lg text-sm"
                title="Attach file"
              >
                📎
              </button>
              <input
                value={draft}
                onChange={(e) => {
                  handleDraftChange(e.target.value);
                  if (conversation && connected) {
                    sendTyping(conversation.id);
                    if (typingTimeout.current) clearTimeout(typingTimeout.current);
                    typingTimeout.current = setTimeout(() => {}, 2000);
                  }
                }}
                placeholder={composerMode === 'note' ? 'Add a private note (@name to mention)…' : 'Type your reply… (/ for shortcuts)'}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </div>

      {token && accountId && (
        <VisitorContextSidebar
          accountId={accountId}
          conversationId={conversation.id}
          token={token}
        />
      )}
    </div>
  );
}
