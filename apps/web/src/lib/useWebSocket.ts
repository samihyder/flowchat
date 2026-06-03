'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWsStore } from '@/store/ws';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3002';

export function useWebSocket() {
  const { token } = useAuthStore();
  const { setSocket, setConnected, setPresence } = useWsStore();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    function connect() {
      const url = `${WS_URL}?token=${token}`;
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
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setSocket(null);
        setConnected(false);
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [token]);
}
