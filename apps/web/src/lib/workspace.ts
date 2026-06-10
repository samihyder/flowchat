import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

export type Workspace =
  | { accountId: string; accountName: string }
  | { pendingApproval: true };

/** Load workspace from API or Vercel /api/workspace fallback. */
export async function fetchWorkspace(token: string): Promise<Workspace | null> {
  try {
    const me = await api.auth.me(token);
    if (me.account?.id) {
      return { accountId: me.account.id, accountName: me.account.name };
    }
  } catch {
    // Railway API may be stale.
  }

  try {
    const res = await fetch('/api/workspace', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 503) {
      throw new Error('DATABASE_URL is not configured on Vercel. Add your Neon connection string in Project Settings → Environment Variables.');
    }
    if (res.ok) {
      const data = (await res.json()) as {
        account?: { id: string; name: string } | null;
        pendingApproval?: boolean;
      };
      if (data.pendingApproval) {
        return { pendingApproval: true as const };
      }
      if (data.account?.id) {
        return { accountId: data.account.id, accountName: data.account.name };
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('DATABASE_URL')) throw err;
  }

  return null;
}

/** Ensure auth store has workspace; returns accountId or null. */
export async function ensureWorkspace(): Promise<string | null> {
  const state = useAuthStore.getState();
  if (!state.token) return null;
  if (state.accountId) return state.accountId;

  const workspace = await fetchWorkspace(state.token);
  if (workspace && 'pendingApproval' in workspace) {
    return null;
  }
  if (workspace && 'accountId' in workspace) {
    state.setAccount(workspace.accountId, workspace.accountName);
    return workspace.accountId;
  }
  return null;
}
