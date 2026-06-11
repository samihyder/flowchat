'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  useWsStore,
  type MessageCreatedEvent,
  type MissedChatEvent,
  type VisitorOnlineEvent,
} from '@/store/ws';
import { getWsUrl } from '@/lib/config';

export function useWebSocket() {
  const { token, accountId } = useAuthStore();
  const {
    setSocket,
    setConnected,
    setPresence,
    pushMessageEvent,
    pushVisitorEvent,
    pushMissedChatEvent,
    subscribeConversation,
    setTyping,
  } = useWsStore();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const activeConversationRef = useRef(useWsStore.getState().activeConversationId);

  useEffect(() => {
    return useWsStore.subscribe((s) => {
      activeConversationRef.current = s.activeConversationId;
    });
  }, []);

  useEffect(() => {
    if (!token || !accountId) return;

    const wsUrl = getWsUrl();

    function connect() {
      const qs = new URLSearchParams({ token: token!, accountId: accountId! });
      const url = `${wsUrl}?${qs.toString()}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setSocket(ws);
        setConnected(true);
        const cid = activeConversationRef.current;
        if (cid) subscribeConversation(cid);

        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;
          if (msg['type'] === 'presence_updated') {
            setPresence(msg['userId'] as string, msg['availability'] as 'online' | 'busy' | 'offline');
          }
          if (msg['type'] === 'message_created') {
            pushMessageEvent(msg as MessageCreatedEvent);
          }
          if (msg['type'] === 'visitor_online') {
            pushVisitorEvent(msg as VisitorOnlineEvent);
          }
          if (msg['type'] === 'missed_chat') {
            pushMissedChatEvent(msg as MissedChatEvent);
          }
          if (msg['type'] === 'typing' && msg['conversationId']) {
            const cid = msg['conversationId'] as string;
            setTyping(cid, true);
            setTimeout(() => setTyping(cid, false), 3000);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (pingTimer.current) {
          clearInterval(pingTimer.current);
          pingTimer.current = null;
        }
        setSocket(null);
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      socketRef.current?.close();
    };
  }, [token, accountId, setSocket, setConnected, setPresence, pushMessageEvent, subscribeConversation]);
}
