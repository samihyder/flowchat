'use client';

import { create } from 'zustand';

export type Availability = 'online' | 'busy' | 'offline';

export type VisitorOnlineEvent = {
  type: 'visitor_online';
  inboxId: string;
  inboxName: string;
  accountId: string;
  ipAddress: string | null;
  countryCode: string | null;
  pageUrl: string | null;
  sourceId: string | null;
  visitedAt: string;
};

export type MissedChatEvent = {
  type: 'missed_chat';
  accountId: string;
  conversationId: string;
  contactName: string;
  inboxName: string;
  minutesWaiting: number;
};

export type WsMessage = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'contact' | 'agent' | 'system';
  senderId: string | null;
  isPrivate?: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  readAt?: string | null;
  attachments?: { id: string; filename: string; contentType: string; publicUrl: string | null }[];
  createdAt: string;
};

export type MessageCreatedEvent = {
  type: 'message_created';
  conversationId: string;
  accountId: string;
  message: WsMessage;
};

export type ConversationViewer = { userId: string; userName: string };

type PresenceMap = Record<string, Availability>;

type WsStore = {
  socket: WebSocket | null;
  connected: boolean;
  presence: PresenceMap;
  lastMessageEvent: MessageCreatedEvent | null;
  messageEventSeq: number;
  lastVisitorEvent: VisitorOnlineEvent | null;
  visitorEventSeq: number;
  lastMissedChatEvent: MissedChatEvent | null;
  missedChatEventSeq: number;
  activeConversationId: string | null;
  typingByConversation: Record<string, boolean>;
  viewersByConversation: Record<string, ConversationViewer[]>;
  setSocket: (socket: WebSocket | null) => void;
  setConnected: (v: boolean) => void;
  setPresence: (userId: string, availability: Availability) => void;
  sendPresence: (availability: Availability) => void;
  subscribeConversation: (conversationId: string, userName?: string) => void;
  sendTyping: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setViewers: (conversationId: string, viewers: ConversationViewer[]) => void;
  pushMessageEvent: (event: MessageCreatedEvent) => void;
  pushVisitorEvent: (event: VisitorOnlineEvent) => void;
  pushMissedChatEvent: (event: MissedChatEvent) => void;
  clearMissedChatEvent: () => void;
};

export const useWsStore = create<WsStore>((set, get) => ({
  socket: null,
  connected: false,
  presence: {},
  lastMessageEvent: null,
  messageEventSeq: 0,
  lastVisitorEvent: null,
  visitorEventSeq: 0,
  lastMissedChatEvent: null,
  missedChatEventSeq: 0,
  activeConversationId: null,
  typingByConversation: {},
  viewersByConversation: {},

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

  subscribeConversation: (conversationId, userName?: string) => {
    set({ activeConversationId: conversationId });
    const { socket, connected } = get();
    if (socket && connected) {
      socket.send(JSON.stringify({ type: 'subscribe_conversation', conversationId, userName }));
    }
  },

  sendTyping: (conversationId) => {
    const { socket, connected } = get();
    if (socket && connected) {
      socket.send(JSON.stringify({ type: 'typing', conversationId }));
    }
  },

  setTyping: (conversationId, isTyping) =>
    set((s) => ({
      typingByConversation: { ...s.typingByConversation, [conversationId]: isTyping },
    })),

  setViewers: (conversationId, viewers) =>
    set((s) => ({
      viewersByConversation: { ...s.viewersByConversation, [conversationId]: viewers },
    })),

  pushMessageEvent: (event) =>
    set((s) => ({
      lastMessageEvent: event,
      messageEventSeq: s.messageEventSeq + 1,
    })),

  pushVisitorEvent: (event) =>
    set((s) => ({
      lastVisitorEvent: event,
      visitorEventSeq: s.visitorEventSeq + 1,
    })),

  pushMissedChatEvent: (event) =>
    set((s) => ({
      lastMissedChatEvent: event,
      missedChatEventSeq: s.missedChatEventSeq + 1,
    })),

  clearMissedChatEvent: () => set({ lastMissedChatEvent: null }),
}));
