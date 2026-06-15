import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { listConversations } from '@/lib/conversations-query';
import { normalizeConversations } from '@/lib/conversation-normalize';
import { processMissedChats } from '@/lib/missed-chats';
import { purgeExpiredVisitorData } from '@/lib/data-retention';
import { parseAccountSettings } from '@/lib/account-settings';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const url = new URL(req.url);
  const inboxId = url.searchParams.get('inboxId');
  const status = url.searchParams.get('status') ?? 'open';
  const filter = url.searchParams.get('filter');
  const priority = url.searchParams.get('priority');
  const labelId = url.searchParams.get('labelId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const validStatuses = ['open', 'pending', 'resolved', 'snoozed'];
  const statusFilter = validStatuses.includes(status) ? status : 'open';

  const sql = neon(databaseUrl) as AppSql;
  void processMissedChats(sql, accountId);

  const accountRow = await sql`SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`;
  const retention = parseAccountSettings(
    (accountRow[0] as { settings: unknown } | undefined)?.settings
  ).dataRetentionDays;
  if (retention && retention >= 30) {
    void purgeExpiredVisitorData(sql, accountId, retention);
  }

  const rows = await listConversations(sql, {
    accountId,
    status: statusFilter,
    inboxId,
    assigneeId: filter === 'mine' ? auth.userId : null,
    unassigned: filter === 'unassigned',
    priority,
    labelId,
    from,
    to,
    agentUserId: auth.userId,
    agentRole: auth.role,
  });

  return Response.json({ conversations: normalizeConversations(rows as Record<string, unknown>[]) });
}
