'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore, type MessageCreatedEvent } from '@/store/ws';
import { getWsUrl } from '@/lib/config';

export function useWebSocket() {
  const { token } = useAuthStore();
  const { setSocket, setConnected, setPresence, pushMessageEvent } = useWsStore();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const wsUrl = getWsUrl();

    function connect() {
      const url = `${wsUrl}?token=${token}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setSocket(ws);
        setConnected(true);
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
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setSocket(null);
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [token, setSocket, setConnected, setPresence, pushMessageEvent]);
}
