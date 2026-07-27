import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deleteCustomRole, getCustomRole, updateCustomRole } from '@/lib/enterprise/roles-saml';

type Params = { params: Promise<{ accountId: string; roleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, roleId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const role = await getCustomRole(sql, accountId, roleId);
  if (!role) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ role });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, roleId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const role = await updateCustomRole(sql, accountId, roleId, {
    name: body.name as string | undefined,
    description: body.description as string | null | undefined,
    permissions: body.permissions as Record<string, unknown> | undefined,
  });
  if (!role) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ role });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, roleId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteCustomRole(sql, accountId, roleId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
