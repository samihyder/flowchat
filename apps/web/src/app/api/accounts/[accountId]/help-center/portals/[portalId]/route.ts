import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { deletePortal, getPortal, updatePortal } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountId: string; portalId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const portal = await getPortal(sql, accountId, portalId);
  if (!portal) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ portal });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const portal = await updatePortal(sql, accountId, portalId, {
    name: body.name as string | undefined,
    slug: body.slug as string | undefined,
    customDomain: body.customDomain as string | null | undefined,
    color: body.color as string | null | undefined,
    logoUrl: body.logoUrl as string | null | undefined,
    headerText: body.headerText as string | null | undefined,
    isPublished: body.isPublished as boolean | undefined,
  });
  if (!portal) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ portal });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { accountId, portalId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const ok = await deletePortal(sql, accountId, portalId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
