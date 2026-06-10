'use client';

import { create } from 'zustand';

export type Availability = 'online' | 'busy' | 'offline';

export type MessageCreatedEvent = {
  type: 'message_created';
  conversationId: string;
  accountId: string;
  message: {
    id: string;
    conversationId: string;
    content: string;
    senderType: 'contact' | 'agent' | 'system';
    senderId: string | null;
    createdAt: string;
  };
};

type PresenceMap = Record<string, Availability>;

type WsStore = {
  socket: WebSocket | null;
  connected: boolean;
  presence: PresenceMap;
  lastMessageEvent: MessageCreatedEvent | null;
  messageEventSeq: number;
  activeConversationId: string | null;
  setSocket: (socket: WebSocket | null) => void;
  setConnected: (v: boolean) => void;
  setPresence: (userId: string, availability: Availability) => void;
  sendPresence: (availability: Availability) => void;
  subscribeConversation: (conversationId: string) => void;
  pushMessageEvent: (event: MessageCreatedEvent) => void;
};

export const useWsStore = create<WsStore>((set, get) => ({
  socket: null,
  connected: false,
  presence: {},
  lastMessageEvent: null,
  messageEventSeq: 0,
  activeConversationId: null,

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

  subscribeConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
    const { socket, connected } = get();
    if (socket && connected) {
      socket.send(JSON.stringify({ type: 'subscribe_conversation', conversationId }));
    }
  },

  pushMessageEvent: (event) =>
    set((s) => ({
      lastMessageEvent: event,
      messageEventSeq: s.messageEventSeq + 1,
    })),
}));
