'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

type MutedConversationsStore = {
  mutedIds: Set<string>;
  loaded: boolean;
  bootstrap: (accountId: string, token: string) => Promise<void>;
  isMuted: (conversationId: string) => boolean;
  toggle: (accountId: string, conversationId: string, muted: boolean, token: string) => Promise<void>;
};

/**
 * Shared, account-scoped set of conversations the current agent has muted.
 * Bootstrapped once in the dashboard layout; useMessageAlert consults
 * `isMuted()` before playing a sound/bumping the tab badge for a new
 * message, and the conversation-thread mute toggle calls `toggle()`.
 */
export const useMutedConversationsStore = create<MutedConversationsStore>((set, get) => ({
  mutedIds: new Set(),
  loaded: false,

  bootstrap: async (accountId, token) => {
    try {
      const r = await api.conversations.mutedIds(accountId, token);
      set({ mutedIds: new Set(r.mutedConversationIds), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  isMuted: (conversationId) => get().mutedIds.has(conversationId),

  toggle: async (accountId, conversationId, muted, token) => {
    const optimistic = new Set(get().mutedIds);
    if (muted) optimistic.add(conversationId);
    else optimistic.delete(conversationId);
    set({ mutedIds: optimistic });

    try {
      await api.conversations.mute(accountId, conversationId, muted, token);
    } catch {
      const reverted = new Set(get().mutedIds);
      if (muted) reverted.delete(conversationId);
      else reverted.add(conversationId);
      set({ mutedIds: reverted });
    }
  },
}));
