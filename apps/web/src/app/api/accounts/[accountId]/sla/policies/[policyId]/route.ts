import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deleteSlaPolicy, getSlaPolicy, updateSlaPolicy } from '@/lib/sla/policies';

type Params = { params: Promise<{ accountId: string; policyId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, policyId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const policy = await getSlaPolicy(sql, accountId, policyId);
  if (!policy) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ policy });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, policyId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const policy = await updateSlaPolicy(sql, accountId, policyId, {
    name: body.name as string | undefined,
    firstResponseMinutes: body.firstResponseMinutes as number | null | undefined,
    nextResponseMinutes: body.nextResponseMinutes as number | null | undefined,
    resolutionMinutes: body.resolutionMinutes as number | null | undefined,
    useBusinessHours: body.useBusinessHours as boolean | undefined,
    isEnabled: body.isEnabled as boolean | undefined,
  });
  if (!policy) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ policy });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, policyId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteSlaPolicy(sql, accountId, policyId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
