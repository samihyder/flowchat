'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSessionCookie, clearSessionCookie } from '@/lib/session-cookie';

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
  isSuperAdmin: boolean;
  setAuth: (
    user: User,
    token: string,
    accountId: string | null,
    accountName: string | null,
    isSuperAdmin?: boolean
  ) => void;
  setAccount: (accountId: string, accountName: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      accountId: null,
      accountName: null,
      isSuperAdmin: false,
      setAuth: (user, token, accountId, accountName, isSuperAdmin = false) => {
        setSessionCookie(token);
        set({
          user,
          token,
          accountId: accountId || null,
          accountName: accountName || null,
          isSuperAdmin,
        });
      },
      setAccount: (accountId, accountName) => {
        set({ accountId, accountName });
      },
      clearAuth: () => {
        clearSessionCookie();
        set({ user: null, token: null, accountId: null, accountName: null, isSuperAdmin: false });
      },
    }),
    { name: 'fc-auth' }
  )
);
