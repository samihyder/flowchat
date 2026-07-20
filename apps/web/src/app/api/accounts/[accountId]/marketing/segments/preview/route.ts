import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { resolveContactsByFilters, type SegmentFilters } from '@/lib/marketing/segments';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    segmentType?: 'static' | 'dynamic';
    filters?: SegmentFilters;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const contacts = await resolveContactsByFilters(
    sql,
    accountId,
    body.segmentType ?? 'dynamic',
    body.filters ?? {}
  );

  return Response.json({ count: contacts.length, preview: contacts.slice(0, 10) });
}
