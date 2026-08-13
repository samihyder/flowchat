'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';
import { useMutedConversationsStore } from '@/store/muted-conversations';
import { playMessageAlert, updateTabBadge } from '@/lib/message-alert';

/** Alert agents on new visitor messages (sound + tab title badge). */
export function useMessageAlert() {
  const { accountId } = useAuthStore();
  const { lastMessageEvent, messageEventSeq, activeConversationId } = useWsStore();
  const selectedConversationId = activeConversationId;
  const isMuted = useMutedConversationsStore((s) => s.isMuted);
  const lastSeq = useRef(0);
  const unreadRef = useRef(0);

  useEffect(() => {
    if (!lastMessageEvent || !accountId) return;
    if (messageEventSeq === lastSeq.current) return;
    lastSeq.current = messageEventSeq;
    if (lastMessageEvent.accountId !== accountId) return;
    if (lastMessageEvent.message.senderType !== 'contact') return;
    if (lastMessageEvent.conversationId === selectedConversationId) return;
    if (isMuted(lastMessageEvent.conversationId)) return;

    playMessageAlert();
    unreadRef.current += 1;
    updateTabBadge(unreadRef.current);
  }, [messageEventSeq, lastMessageEvent, accountId, selectedConversationId, isMuted]);

  useEffect(() => {
    if (selectedConversationId) {
      unreadRef.current = Math.max(0, unreadRef.current - 1);
      updateTabBadge(unreadRef.current);
    }
  }, [selectedConversationId]);
}
