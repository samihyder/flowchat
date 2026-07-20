import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { countSegmentContacts } from '@/lib/marketing/segments';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT id, name, segment_type as "segmentType", filters, created_at as "createdAt", updated_at as "updatedAt"
    FROM marketing_segments WHERE account_id = ${accountId}::uuid
    ORDER BY name ASC
  `;

  type SegmentRow = {
    id: string;
    name: string;
    segmentType: string;
    filters: unknown;
    createdAt: Date | string;
    updatedAt: Date | string;
  };

  const segments = await Promise.all(
    (rows as SegmentRow[]).map(async (s) => ({
      ...s,
      contactCount: await countSegmentContacts(sql, accountId, s.id),
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    }))
  );

  return Response.json({ segments });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    segmentType?: 'static' | 'dynamic';
    filters?: Record<string, unknown>;
  };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    INSERT INTO marketing_segments (account_id, name, segment_type, filters)
    VALUES (
      ${accountId}::uuid,
      ${name},
      ${body.segmentType ?? 'dynamic'},
      ${JSON.stringify(body.filters ?? {})}::jsonb
    )
    RETURNING id, name, segment_type as "segmentType", filters, created_at as "createdAt"
  `;

  return Response.json({ segment: rows[0] }, { status: 201 });
}
