import { fetchWorkspace, type Workspace } from '@/lib/workspace';

type SignedInUser = { id: string; name: string; email: string };

export async function resolveWorkspace(
  token: string,
  account: { id: string; name: string; slug: string } | null | undefined
): Promise<Workspace | null> {
  if (account?.id) {
    return { accountId: account.id, accountName: account.name };
  }
  return fetchWorkspace(token);
}

export type { SignedInUser };
