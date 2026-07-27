import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createCategory, listCategories } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountId: string; portalId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ categories: await listCategories(sql, accountId, portalId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; parentId?: string | null; sortOrder?: number };
  if (!body.name?.trim()) return Response.json({ error: 'name required' }, { status: 400 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const category = await createCategory(sql, accountId, portalId, {
    name: body.name.trim(), parentId: body.parentId, sortOrder: body.sortOrder,
  });
  return Response.json({ category }, { status: 201 });
}
