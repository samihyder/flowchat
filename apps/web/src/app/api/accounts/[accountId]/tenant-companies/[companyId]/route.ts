import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import {
  deleteTenantCompany, getTenantCompany, updateTenantCompany,
} from '@/lib/enterprise/tenant-companies';

type Params = { params: Promise<{ accountId: string; companyId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, companyId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const company = await getTenantCompany(sql, accountId, companyId);
  if (!company) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ company });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, companyId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const company = await updateTenantCompany(sql, accountId, companyId, {
    name: body.name as string | undefined,
    domain: body.domain as string | null | undefined,
    description: body.description as string | null | undefined,
    customAttributes: body.customAttributes as Record<string, unknown> | undefined,
    globalCompanyId: body.globalCompanyId as string | null | undefined,
  });
  if (!company) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ company });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, companyId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteTenantCompany(sql, accountId, companyId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
