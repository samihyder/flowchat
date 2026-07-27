import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createTenantCompany, listTenantCompanies } from '@/lib/enterprise/tenant-companies';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ companies: await listTenantCompanies(sql, accountId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await req.json()) as {
    name?: string; domain?: string | null; description?: string | null;
    customAttributes?: Record<string, unknown>; globalCompanyId?: string | null;
  };
  if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const company = await createTenantCompany(sql, accountId, {
    name: body.name.trim(), domain: body.domain, description: body.description,
    customAttributes: body.customAttributes, globalCompanyId: body.globalCompanyId,
  });
  return Response.json({ company }, { status: 201 });
}
