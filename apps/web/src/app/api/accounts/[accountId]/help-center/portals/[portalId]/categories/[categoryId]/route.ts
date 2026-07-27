import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deleteCategory, updateCategory } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountId: string; portalId: string; categoryId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, categoryId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const category = await updateCategory(sql, accountId, categoryId, {
    name: body.name as string | undefined,
    parentId: body.parentId as string | null | undefined,
    sortOrder: body.sortOrder as number | undefined,
  });
  if (!category) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ category });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, categoryId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteCategory(sql, accountId, categoryId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
