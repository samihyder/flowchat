import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIp } from '@/lib/request-ip';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; webhookId: string }> };

const VALID_EVENTS = [
  'conversation.created',
  'message.created',
  'conversation.resolved',
  'contact.created',
  'contact.updated',
  'contact.deleted',
];

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, webhookId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const body = (await req.json()) as { url?: string; events?: string[]; enabled?: boolean };
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  let eventsJson: string | null = null;
  if (body.events) {
    const events = body.events.filter((e) => VALID_EVENTS.includes(e));
    if (events.length === 0) return Response.json({ error: 'At least one valid event required' }, { status: 400 });
    eventsJson = JSON.stringify(events);
  }

  const sql = neon(databaseUrl) as AppSql;
  const rows = await sql`
    UPDATE account_webhooks SET
      url = COALESCE(${body.url?.trim() ?? null}, url),
      events = COALESCE(${eventsJson}::jsonb, events),
      enabled = COALESCE(${body.enabled ?? null}, enabled),
      updated_at = NOW()
    WHERE id = ${webhookId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, url, events, enabled
  `;
  if (!rows[0]) return Response.json({ error: 'Webhook not found' }, { status: 404 });

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'webhook.updated',
    resourceType: 'webhook',
    resourceId: webhookId,
    ipAddress: getClientIp(req),
  });

  return Response.json({ webhook: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, webhookId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl) as AppSql;
  const rows = await sql`
    DELETE FROM account_webhooks WHERE id = ${webhookId}::uuid AND account_id = ${accountId}::uuid RETURNING id
  `;
  if (!rows[0]) return Response.json({ error: 'Webhook not found' }, { status: 404 });

  await writeAuditLog(sql, {
    accountId,
    actorId: auth.userId,
    action: 'webhook.deleted',
    resourceType: 'webhook',
    resourceId: webhookId,
    ipAddress: getClientIp(req),
  });

  return Response.json({ ok: true });
}
