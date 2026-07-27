import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createSlaPolicy, listSlaPolicies } from '@/lib/sla/policies';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ policies: await listSlaPolicies(sql, accountId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as {
    name?: string; firstResponseMinutes?: number | null; nextResponseMinutes?: number | null;
    resolutionMinutes?: number | null; useBusinessHours?: boolean; isEnabled?: boolean;
  };
  if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const policy = await createSlaPolicy(sql, accountId, {
    name: body.name.trim(),
    firstResponseMinutes: body.firstResponseMinutes,
    nextResponseMinutes: body.nextResponseMinutes,
    resolutionMinutes: body.resolutionMinutes,
    useBusinessHours: body.useBusinessHours,
    isEnabled: body.isEnabled,
  });
  return Response.json({ policy }, { status: 201 });
}
