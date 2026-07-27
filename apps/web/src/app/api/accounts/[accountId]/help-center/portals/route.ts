import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { createPortal, listPortals } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  return Response.json({ portals: await listPortals(sql, accountId) });
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
    name?: string; slug?: string; customDomain?: string | null; color?: string | null;
    logoUrl?: string | null; headerText?: string | null; isPublished?: boolean;
  };
  if (!body.name?.trim() || !body.slug?.trim()) {
    return Response.json({ error: 'name and slug required' }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const portal = await createPortal(sql, accountId, {
    name: body.name.trim(), slug: body.slug.trim(), customDomain: body.customDomain,
    color: body.color, logoUrl: body.logoUrl, headerText: body.headerText, isPublished: body.isPublished,
  });
  return Response.json({ portal }, { status: 201 });
}
