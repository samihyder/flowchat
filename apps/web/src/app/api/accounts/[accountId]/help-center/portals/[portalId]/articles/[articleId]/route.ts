import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deleteArticle, updateArticle } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountId: string; portalId: string; articleId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, articleId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as Record<string, unknown>;
  if (body.status === 'published' && auth.role !== 'administrator') {
    return Response.json({ error: 'Only administrators can publish articles.' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const article = await updateArticle(sql, accountId, articleId, {
    title: body.title as string | undefined,
    slug: body.slug as string | undefined,
    bodyHtml: body.bodyHtml as string | undefined,
    categoryId: body.categoryId as string | null | undefined,
    status: body.status as string | undefined,
    locale: body.locale as string | undefined,
    metaDescription: body.metaDescription as string | null | undefined,
  });
  if (!article) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ article });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, articleId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deleteArticle(sql, accountId, articleId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
