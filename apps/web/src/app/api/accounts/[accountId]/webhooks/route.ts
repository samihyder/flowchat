import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

const VALID_EVENTS = ['conversation.created', 'message.created', 'conversation.resolved'];

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await authorizeAccount(token, accountId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT id, url, events, enabled, created_at as "createdAt"
    FROM account_webhooks
    WHERE account_id = ${accountId}::uuid
    ORDER BY created_at DESC
  `;

  return Response.json({ webhooks: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as { url?: string; events?: string[] };
  if (!body.url?.trim()) return Response.json({ error: 'url is required' }, { status: 400 });

  const events = (body.events ?? VALID_EVENTS).filter((e) => VALID_EVENTS.includes(e));
  if (events.length === 0) return Response.json({ error: 'At least one valid event required' }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const secret = randomBytes(24).toString('hex');

  const rows = await sql`
    INSERT INTO account_webhooks (account_id, url, secret, events)
    VALUES (${accountId}::uuid, ${body.url.trim()}, ${secret}, ${JSON.stringify(events)}::jsonb)
    RETURNING id, url, events, enabled, secret
  `;

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'webhook.created',
    resourceType: 'webhook',
    resourceId: (rows[0] as { id: string }).id,
  });

  return Response.json({ webhook: rows[0] }, { status: 201 });
}
