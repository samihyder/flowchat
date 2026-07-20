import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; entryId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, entryId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const type = new URL(req.url).searchParams.get('type');
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (type === 'ip') {
    await sql`DELETE FROM blocked_ips WHERE id = ${entryId}::uuid AND account_id = ${accountId}::uuid`;
    return Response.json({ ok: true });
  }

  if (type === 'contact') {
    await sql`
      UPDATE contacts
      SET is_blocked = false, blocked_at = NULL, blocked_reason = NULL, updated_at = NOW()
      WHERE id = ${entryId}::uuid AND account_id = ${accountId}::uuid
    `;
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'type query param must be "ip" or "contact"' }, { status: 400 });
}
