import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { previewSegmentContacts } from '@/lib/marketing/segments';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; segmentId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, segmentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const preview = await previewSegmentContacts(sql, accountId, segmentId, 10);
  return Response.json({ preview });
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
