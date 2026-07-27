import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createCustomRole, listCustomRoles } from '@/lib/enterprise/roles-saml';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ roles: await listCustomRoles(sql, accountId) });
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
    name?: string; description?: string | null; permissions?: Record<string, unknown>;
  };
  if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const role = await createCustomRole(sql, accountId, {
    name: body.name.trim(), description: body.description, permissions: body.permissions,
  });
  return Response.json({ role }, { status: 201 });
}
