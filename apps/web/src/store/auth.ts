'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

type AuthStore = {
  user: User | null;
  token: string | null;
  accountId: string | null;
  accountName: string | null;
  setAuth: (user: User, token: string, accountId: string, accountName: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      accountId: null,
      accountName: null,
      setAuth: (user, token, accountId, accountName) =>
        set({ user, token, accountId, accountName }),
      clearAuth: () => set({ user: null, token: null, accountId: null, accountName: null }),
    }),
    { name: 'fc-auth' }
  )
);
