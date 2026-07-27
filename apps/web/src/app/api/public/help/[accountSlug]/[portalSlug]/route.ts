import { neon } from '@/lib/neon';
import type { AppSql } from '@/lib/db-sql';
import { getPublishedPortalBySlug } from '@/lib/help-center/portals';

type Params = { params: Promise<{ accountSlug: string; portalSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountSlug, portalSlug } = await params;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const data = await getPublishedPortalBySlug(sql, accountSlug, portalSlug);
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}
