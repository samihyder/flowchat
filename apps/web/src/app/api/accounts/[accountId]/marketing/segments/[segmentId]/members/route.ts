import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; segmentId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, segmentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { contactIds?: string[] };
  if (!body.contactIds?.length) {
    return Response.json({ error: 'contactIds required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const seg = await sql`
    SELECT id FROM marketing_segments
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid AND segment_type = 'static'
    LIMIT 1
  `;
  if (!seg[0]) return Response.json({ error: 'Static segment not found' }, { status: 404 });

  for (const contactId of body.contactIds) {
    await sql`
      INSERT INTO marketing_segment_members (segment_id, contact_id)
      SELECT ${segmentId}::uuid, ${contactId}::uuid
      WHERE EXISTS (SELECT 1 FROM contacts WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid)
      ON CONFLICT DO NOTHING
    `;
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, segmentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { contactId?: string };
  if (!body.contactId) return Response.json({ error: 'contactId required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  await sql`
    DELETE FROM marketing_segment_members
    WHERE segment_id = ${segmentId}::uuid AND contact_id = ${body.contactId}::uuid
  `;
  return Response.json({ ok: true });
}
