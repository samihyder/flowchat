import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; inboxId: string; exceptionId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, inboxId, exceptionId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    DELETE FROM inbox_analytics_exceptions
    WHERE id = ${exceptionId}::uuid
      AND inbox_id = ${inboxId}::uuid
      AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows[0]) return Response.json({ error: 'Exception not found' }, { status: 404 });
  return Response.json({ ok: true });
}
