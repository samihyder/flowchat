'use client';

import { create } from 'zustand';

export type Availability = 'online' | 'busy' | 'offline';

type PresenceMap = Record<string, Availability>;

type WsStore = {
  socket: WebSocket | null;
  connected: boolean;
  presence: PresenceMap;
  setSocket: (socket: WebSocket | null) => void;
  setConnected: (v: boolean) => void;
  setPresence: (userId: string, availability: Availability) => void;
  sendPresence: (availability: Availability) => void;
};

export const useWsStore = create<WsStore>((set, get) => ({
  socket: null,
  connected: false,
  presence: {},

  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),
  setPresence: (userId, availability) =>
    set((s) => ({ presence: { ...s.presence, [userId]: availability } })),

  sendPresence: (availability) => {
    const { socket, connected } = get();
    if (socket && connected) {
      socket.send(JSON.stringify({ type: 'presence', availability }));
    }
  },
}));
