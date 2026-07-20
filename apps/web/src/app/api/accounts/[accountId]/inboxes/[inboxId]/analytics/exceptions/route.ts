import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; inboxId: string }> };

async function assertInbox(sql: AppSql, accountId: string, inboxId: string) {
  const rows = (await sql`
    SELECT id FROM inboxes WHERE id = ${inboxId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `) as { id: string }[];
  return rows.length > 0;
}

export async function GET(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  if (!(await assertInbox(sql, accountId, inboxId))) {
    return Response.json({ error: 'Inbox not found' }, { status: 404 });
  }

  const rows = await sql`
    SELECT id, inbox_id as "inboxId", exception_type as "type", value, label,
           created_at as "createdAt"
    FROM inbox_analytics_exceptions
    WHERE inbox_id = ${inboxId}::uuid
    ORDER BY created_at DESC
  `;

  return Response.json({ exceptions: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, inboxId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await req.json()) as { type?: 'ip' | 'machine'; value?: string; label?: string };
  const type = body.type;
  const value = body.value?.trim();
  if (!type || !value) {
    return Response.json({ error: 'type and value are required' }, { status: 400 });
  }
  if (type !== 'ip' && type !== 'machine') {
    return Response.json({ error: 'type must be ip or machine' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  if (!(await assertInbox(sql, accountId, inboxId))) {
    return Response.json({ error: 'Inbox not found' }, { status: 404 });
  }

  const rows = await sql`
    INSERT INTO inbox_analytics_exceptions (account_id, inbox_id, exception_type, value, label)
    VALUES (
      ${accountId}::uuid,
      ${inboxId}::uuid,
      ${type},
      ${value},
      ${body.label?.trim() || null}
    )
    ON CONFLICT (inbox_id, exception_type, value) DO UPDATE SET label = EXCLUDED.label
    RETURNING id, inbox_id as "inboxId", exception_type as "type", value, label,
              created_at as "createdAt"
  `;

  return Response.json({ exception: rows[0] }, { status: 201 });
}
