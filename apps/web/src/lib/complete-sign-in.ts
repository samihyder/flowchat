import { api } from '@/lib/api';

type SignedInUser = { id: string; name: string; email: string };

export async function resolveWorkspace(
  token: string,
  account: { id: string; name: string; slug: string } | null | undefined
): Promise<{ accountId: string; accountName: string } | null> {
  if (account?.id) {
    return { accountId: account.id, accountName: account.name };
  }

  try {
    const me = await api.auth.me(token);
    if (me.account?.id) {
      return { accountId: me.account.id, accountName: me.account.name };
    }
  } catch {
    // Fall through — caller shows a friendly error.
  }

  return null;
}

export type { SignedInUser };
