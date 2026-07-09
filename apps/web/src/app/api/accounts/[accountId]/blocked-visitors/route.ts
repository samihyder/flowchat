import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const [ipRows, contactRows] = await Promise.all([
    sql`
      SELECT id, ip_address as "value", reason, created_at as "blockedAt"
      FROM blocked_ips
      WHERE account_id = ${accountId}::uuid
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, name as "value", blocked_reason as "reason", blocked_at as "blockedAt"
      FROM contacts
      WHERE account_id = ${accountId}::uuid AND is_blocked = true
      ORDER BY blocked_at DESC NULLS LAST
    `,
  ]);

  const entries = [
    ...(ipRows as { id: string; value: string; reason: string | null; blockedAt: Date }[]).map((r) => ({
      id: r.id,
      type: 'ip' as const,
      value: r.value,
      reason: r.reason,
      blockedAt: new Date(r.blockedAt).toISOString(),
    })),
    ...(contactRows as { id: string; value: string; reason: string | null; blockedAt: Date | null }[]).map((r) => ({
      id: r.id,
      type: 'contact' as const,
      value: r.value,
      reason: r.reason,
      blockedAt: r.blockedAt ? new Date(r.blockedAt).toISOString() : null,
    })),
  ].sort((a, b) => (b.blockedAt ?? '').localeCompare(a.blockedAt ?? ''));

  return Response.json({ entries });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as {
    type?: 'ip' | 'contact';
    value?: string;
    contactId?: string;
    reason?: string | null;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const reason = body.reason?.trim() || null;

  if (body.type === 'ip') {
    const ip = body.value?.trim();
    if (!ip) return Response.json({ error: 'IP address is required' }, { status: 400 });
    const rows = await sql`
      INSERT INTO blocked_ips (account_id, ip_address, reason)
      VALUES (${accountId}::uuid, ${ip}, ${reason})
      RETURNING id, ip_address as "value", reason, created_at as "blockedAt"
    `;
    return Response.json({ entry: { ...rows[0], type: 'ip' } }, { status: 201 });
  }

  if (body.type === 'contact') {
    const contactId = body.contactId?.trim();
    if (!contactId) return Response.json({ error: 'A contact must be selected' }, { status: 400 });
    const rows = await sql`
      UPDATE contacts
      SET is_blocked = true, blocked_at = NOW(), blocked_reason = ${reason}, updated_at = NOW()
      WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
      RETURNING id, name as "value", blocked_reason as "reason", blocked_at as "blockedAt"
    `;
    if (!rows[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });
    return Response.json({ entry: { ...rows[0], type: 'contact' } }, { status: 201 });
  }

  return Response.json({ error: 'type must be "ip" or "contact"' }, { status: 400 });
}
