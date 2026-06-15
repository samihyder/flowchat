'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, type ChatMessage, type CannedResponse, type Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { ConversationToolbar } from '@/components/conversations/conversation-toolbar';
import { VisitorContextSidebar } from '@/components/conversations/visitor-context-sidebar';
import { initials } from '@/components/conversations/conversation-badges';
import { Button } from '@/components/ui/button';

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return `Today, ${formatMessageTime(iso)}`;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function downloadTranscript(conversation: Conversation, messages: ChatMessage[]) {
  const lines = messages
    .filter((m) => m.senderType !== 'system' && !m.deletedAt)
    .map((m) => {
      const who = m.isPrivate ? 'Note' : m.senderType === 'agent' ? 'Agent' : conversation.contactName;
      return `[${new Date(m.createdAt).toISOString()}] ${who}: ${m.content}`;
    });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowchat-${conversation.contactName.replace(/\s+/g, '-').toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  conversation: Conversation | null;
  onConversationUpdate?: () => void;
  onBack?: () => void;
};

export function ConversationThread({ conversation, onConversationUpdate, onBack }: Props) {
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
  const [cannedPick, setCannedPick] = useState<CannedResponse | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [agents, setAgents] = useState<{ userId: string; name: string }[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastEventSeq = useRef(0);

  const viewers = conversation ? viewersByConversation[conversation.id] ?? [] : [];
  const otherViewers = viewers.filter((v) => v.userId !== user?.id);

  const subtitle = useMemo(() => {
    if (!conversation) return '';
    const domain = conversation.contactEmail?.includes('@')
      ? conversation.contactEmail.split('@')[1]
      : null;
    return [domain, 'Web Chat', `Inbox: ${conversation.inboxName}`].filter(Boolean).join(' · ');
  }, [conversation]);

  const fetchMessages = useCallback(async () => {
    if (!conversation || !token || !accountId) return;
    try {
      const res = await api.conversations.listMessages(accountId, conversation.id, token);
      setMessages((prev) => mergeMessages(prev, res.messages));
      setNextCursor(res.nextCursor);
    } catch {
      /* keep existing */
    }
  }, [conversation, token, accountId]);

  useEffect(() => {
    if (!token || !accountId) return;
    api.agents
      .list(accountId, token)
      .then((r) => setAgents(r.agents.filter((a) => a.membershipStatus === 'active').map((a) => ({ userId: a.userId, name: a.name }))))
      .catch(() => {});
  }, [token, accountId]);

  useEffect(() => {
    if (!conversation?.id) {
      setDraft('');
      return;
    }
    const saved = localStorage.getItem(`fc-draft:${conversation.id}`);
    setDraft(saved ?? '');
    setComposerMode('reply');
    setCannedPick(null);
  }, [conversation?.id]);

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

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (value.startsWith('/') && accountId && token) {
      const q = value.slice(1).split(' ')[0] ?? '';
      api.cannedResponses
        .list(accountId, token, q)
        .then((r) => {
          setCanned(r.responses);
          setCannedPick(r.responses[0] ?? null);
        })
        .catch(() => setCannedPick(null));
    } else {
      setCanned([]);
      setCannedPick(null);
    }
  };

  const insertCanned = (content: string) => {
    setDraft(content);
    setCannedPick(null);
    setCanned([]);
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
    localStorage.removeItem(`fc-draft:${conversation.id}`);
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
    } catch {
      /* ignore */
    } finally {
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
    } catch {
      /* ignore */
    }
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
    } catch {
      /* ignore */
    }
  };

  const handleResolve = async () => {
    if (!conversation || !token || !accountId) return;
    try {
      await api.conversations.updateStatus(accountId, conversation.id, 'resolved', token);
      onConversationUpdate?.();
    } catch {
      /* ignore */
    }
  };

  const handleReassign = async (assigneeId: string | null) => {
    if (!conversation || !token || !accountId) return;
    setSavingAssign(true);
    try {
      await api.conversations.update(accountId, conversation.id, { assigneeId }, token);
      onConversationUpdate?.();
    } finally {
      setSavingAssign(false);
    }
  };

  const saveDraft = () => {
    if (!conversation) return;
    localStorage.setItem(`fc-draft:${conversation.id}`, draft);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-12 bg-gray-50">
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

  let lastDay = '';

  return (
    <div className="flex-1 flex min-w-0 min-h-0">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Wireframe topbar */}
        <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-5 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{conversation.contactName}</h2>
            <p className="text-xs text-gray-500 truncate">
              {subtitle}
              {!connected && <span className="text-amber-600 ml-2">· reconnecting…</span>}
            </p>
          </div>
          {onBack && (
            <Button type="button" variant="secondary" size="sm" onClick={onBack} className="shrink-0">
              ← Back
            </Button>
          )}
        </header>

        <ConversationToolbar
          conversation={conversation}
          onUpdated={() => onConversationUpdate?.()}
          onResolve={() => void handleResolve()}
          onExport={() => downloadTranscript(conversation, messages)}
        />

        {otherViewers.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center gap-2 shrink-0">
            <span aria-hidden>👁</span>
            <span>
              <strong>{otherViewers.map((v) => v.userName).join(', ')}</strong>
              {otherViewers.length === 1 ? ' is' : ' are'} also viewing this conversation
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0">
          {nextCursor && (
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              className="w-full text-xs text-primary-600 py-2 mb-2"
            >
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </button>
          )}
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg) => {
              const day = new Date(msg.createdAt).toDateString();
              const showDay = day !== lastDay;
              if (showDay) lastDay = day;

              const isPending = msg.id.startsWith('pending-');
              const isAgent = msg.senderType === 'agent';
              const isOwn = isAgent && msg.senderId === user?.id;
              const isSystem = msg.senderType === 'system';
              const isNote = msg.isPrivate;

              if (isSystem) {
                return (
                  <div key={msg.id}>
                    {showDay && <DayPill label={formatDayLabel(msg.createdAt)} />}
                    <p className="text-xs text-center text-gray-400 py-2">{msg.content}</p>
                  </div>
                );
              }

              const canEdit =
                isOwn &&
                !msg.deletedAt &&
                !isNote &&
                Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000;

              const avatarName = isAgent
                ? isOwn
                  ? (user?.name ?? 'You')
                  : 'Agent'
                : conversation.contactName;
              const avatarBg = isAgent
                ? 'bg-primary-500 text-white'
                : 'bg-primary-100 text-primary-700';

              return (
                <div key={msg.id}>
                  {showDay && <DayPill label={formatDayLabel(msg.createdAt)} />}
                  <div className={`flex gap-2.5 mb-4 ${isAgent && !isNote ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${isNote ? 'bg-amber-100 text-amber-800' : avatarBg}`}
                    >
                      {initials(avatarName)}
                    </div>
                    <div className={`max-w-[75%] ${isAgent && !isNote ? 'items-end' : ''}`}>
                      {isNote && (
                        <p className="text-[10px] font-semibold uppercase text-amber-700 mb-1">
                          📌 Private note
                        </p>
                      )}
                      {editingId === msg.id ? (
                        <div className="space-y-2 bg-white border rounded-lg p-2">
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            className="w-full text-gray-900 text-sm rounded border p-2"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => saveEdit(msg.id)} className="text-xs text-primary-600">
                              Save
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                            isNote
                              ? 'bg-amber-50 border border-amber-200 text-amber-950 rounded-lg'
                              : isAgent && !isNote
                                ? 'bg-primary-500 text-white rounded-br-sm'
                                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                          } ${isPending ? 'opacity-70' : ''}`}
                        >
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
                                className="mt-2 flex items-center gap-2.5 border border-gray-200 rounded-lg p-2.5 bg-gray-50 hover:bg-gray-100"
                              >
                                <div className="w-9 h-9 bg-primary-100 rounded-md flex items-center justify-center text-sm">
                                  📄
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-gray-900 truncate">
                                    {a.filename}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {(a.sizeBytes / 1024 / 1024).toFixed(1)} MB
                                  </div>
                                </div>
                                <span className="text-xs text-primary-600 shrink-0">⬇ Download</span>
                              </a>
                            ) : null
                          )}
                        </div>
                      )}
                      <p
                        className={`text-[10px] mt-1 flex flex-wrap items-center gap-2 ${
                          isNote ? 'text-amber-700' : isAgent && !isNote ? 'text-gray-400 justify-end' : 'text-gray-400'
                        }`}
                      >
                        <span>
                          {isPending
                            ? 'Sending…'
                            : `${formatMessageTime(msg.createdAt)}${msg.readAt && isOwn && !isNote ? ' · Read ✓✓' : msg.editedAt ? ' · edited' : ''}`}
                        </span>
                        {isNote && <span>· Note visible to agents only</span>}
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
                </div>
              );
            })
          )}

          {typingByConversation[conversation.id] && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-semibold">
                {initials(conversation.contactName)}
              </div>
              <span className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5">● ● ●</span>
              <span>Visitor is typing…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {conversation.status === 'open' && (
          <form onSubmit={handleSend} className="border-t border-gray-200 bg-white p-4 shrink-0">
            <div className="flex gap-1 mb-2.5">
              <button
                type="button"
                onClick={() => setComposerMode('reply')}
                className={`text-xs font-medium px-2.5 py-1 rounded-md ${composerMode === 'reply' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                💬 Reply
              </button>
              <button
                type="button"
                onClick={() => setComposerMode('note')}
                className={`text-xs font-medium px-2.5 py-1 rounded-md ${composerMode === 'note' ? 'bg-amber-50 text-amber-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🔒 Note
              </button>
            </div>

            {cannedPick && draft.startsWith('/') && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 mb-2 text-xs flex items-center gap-2">
                <span className="text-primary-600 font-semibold font-mono">/{cannedPick.shortcut}</span>
                <span className="text-gray-700 flex-1 truncate">{cannedPick.content}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-[11px] shrink-0"
                  onClick={() => insertCanned(cannedPick.content)}
                >
                  Insert ↵
                </Button>
              </div>
            )}

            <textarea
              value={draft}
              onChange={(e) => {
                handleDraftChange(e.target.value);
                if (conversation && connected && composerMode === 'reply') {
                  sendTyping(conversation.id);
                  if (typingTimeout.current) clearTimeout(typingTimeout.current);
                  typingTimeout.current = setTimeout(() => {}, 2000);
                }
              }}
              placeholder={
                composerMode === 'note'
                  ? 'Add a private note (@name to mention)…'
                  : 'Type a reply… Use / for canned responses'
              }
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />

            <div className="flex items-center justify-between mt-2.5 gap-2">
              <div className="flex gap-1">
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
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                  title="Attach file"
                >
                  📎
                </button>
                <button
                  type="button"
                  onClick={() => handleDraftChange('/')}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-mono"
                  title="Canned responses"
                >
                  /
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                  title="Emoji"
                  disabled
                >
                  😊
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                  title="Mention agent"
                  disabled={composerMode !== 'note'}
                >
                  @
                </button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                  Send ↵
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {token && accountId && (
        <VisitorContextSidebar
          accountId={accountId}
          conversation={conversation}
          token={token}
          agents={agents}
          onReassign={(id) => void handleReassign(id)}
          saving={savingAssign}
        />
      )}
    </div>
  );
}

function DayPill({ label }: { label: string }) {
  return (
    <div className="text-center my-3">
      <span className="inline-block bg-gray-200 text-gray-600 text-[11px] px-3 py-0.5 rounded-full">
        {label}
      </span>
    </div>
  );
}
