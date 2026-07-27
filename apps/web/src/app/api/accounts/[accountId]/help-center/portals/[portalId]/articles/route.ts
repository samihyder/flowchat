import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createArticle, listArticles } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountId: string; portalId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ articles: await listArticles(sql, accountId, portalId) });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    title?: string; slug?: string; bodyHtml?: string; categoryId?: string | null;
    status?: string; locale?: string; metaDescription?: string | null;
  };
  if (!body.title?.trim() || !body.slug?.trim()) {
    return Response.json({ error: 'title and slug required' }, { status: 400 });
  }
  if (body.status === 'published' && auth.role !== 'administrator') {
    return Response.json({ error: 'Only administrators can publish articles.' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const article = await createArticle(sql, accountId, portalId, auth.userId, {
    title: body.title.trim(), slug: body.slug.trim(), bodyHtml: body.bodyHtml,
    categoryId: body.categoryId, status: body.status, locale: body.locale,
    metaDescription: body.metaDescription,
  });
  return Response.json({ article }, { status: 201 });
}
