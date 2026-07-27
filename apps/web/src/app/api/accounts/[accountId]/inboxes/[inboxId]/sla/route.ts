import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { attachSlaToInbox, getInboxSlaPolicy } from '@/lib/sla/policies';

type Params = { params: Promise<{ accountId: string; inboxId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const policy = await getInboxSlaPolicy(sql, accountId, inboxId);
  return Response.json({ policy });
}

export async function PUT(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as { policyId?: string };
  if (!body.policyId) return Response.json({ error: 'policyId required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    await attachSlaToInbox(sql, accountId, inboxId, body.policyId);
    const policy = await getInboxSlaPolicy(sql, accountId, inboxId);
    return Response.json({ policy });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return Response.json({ error: message }, { status: 404 });
  }
}
