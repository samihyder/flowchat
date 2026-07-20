import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { countSegmentContacts, previewSegmentContacts } from '@/lib/marketing/segments';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; segmentId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, segmentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT id, name, segment_type as "segmentType", filters, created_at as "createdAt", updated_at as "updatedAt"
    FROM marketing_segments WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const segmentRow = rows[0] as
    | { id: string; name: string; segmentType: string; filters: unknown; createdAt: Date | string; updatedAt: Date | string }
    | undefined;
  if (!segmentRow) return Response.json({ error: 'Segment not found' }, { status: 404 });

  const [preview, contactCount] = await Promise.all([
    previewSegmentContacts(sql, accountId, segmentId, 10),
    countSegmentContacts(sql, accountId, segmentId),
  ]);

  return Response.json({
    segment: {
      ...segmentRow,
      contactCount,
      createdAt: new Date(segmentRow.createdAt).toISOString(),
      updatedAt: new Date(segmentRow.updatedAt).toISOString(),
    },
    preview,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, segmentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    segmentType?: 'static' | 'dynamic';
    filters?: Record<string, unknown>;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await sql`
    SELECT id, name, segment_type as "segmentType", filters
    FROM marketing_segments WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Segment not found' }, { status: 404 });
  const current = existing[0] as { name: string; segmentType: string; filters: unknown };

  const name = body.name?.trim() || current.name;
  const segmentType = body.segmentType ?? current.segmentType;
  const filters = body.filters ?? current.filters ?? {};

  const rows = await sql`
    UPDATE marketing_segments
    SET name = ${name}, segment_type = ${segmentType}, filters = ${JSON.stringify(filters)}::jsonb, updated_at = NOW()
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, segment_type as "segmentType", filters, created_at as "createdAt", updated_at as "updatedAt"
  `;

  const contactCount = await countSegmentContacts(sql, accountId, segmentId);
  const updated = rows[0] as { createdAt: Date | string; updatedAt: Date | string };

  return Response.json({
    segment: {
      ...updated,
      contactCount,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    },
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, segmentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  await sql`DELETE FROM marketing_segments WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid`;
  return Response.json({ ok: true });
}
