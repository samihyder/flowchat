import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { campaignRates } from '@/lib/marketing/campaign-dispatch';

type Params = { params: Promise<{ accountId: string }> };

function serializeCampaign(row: Record<string, unknown>) {
  const c = {
    id: row.id as string,
    name: row.name as string,
    subject: row.subject as string,
    status: row.status as string,
    templateId: row.templateId as string | null,
    segmentId: row.segmentId as string | null,
    segmentName: row.segmentName as string | null,
    totalRecipients: Number(row.totalRecipients ?? 0),
    sentCount: Number(row.sentCount ?? 0),
    deliveredCount: Number(row.deliveredCount ?? 0),
    openedCount: Number(row.openedCount ?? 0),
    clickedCount: Number(row.clickedCount ?? 0),
    bouncedCount: Number(row.bouncedCount ?? 0),
    complainedCount: Number(row.complainedCount ?? 0),
    unsubscribedCount: Number(row.unsubscribedCount ?? 0),
    failedCount: Number(row.failedCount ?? 0),
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt as Date).toISOString() : null,
    startedAt: row.startedAt ? new Date(row.startedAt as Date).toISOString() : null,
    completedAt: row.completedAt ? new Date(row.completedAt as Date).toISOString() : null,
    createdAt: new Date(row.createdAt as Date).toISOString(),
  };
  return { ...c, rates: campaignRates(c) };
}

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT c.id, c.name, c.subject, c.status, c.template_id as "templateId",
           c.segment_id as "segmentId", s.name as "segmentName",
           c.total_recipients as "totalRecipients", c.sent_count as "sentCount",
           c.delivered_count as "deliveredCount", c.opened_count as "openedCount",
           c.clicked_count as "clickedCount", c.bounced_count as "bouncedCount",
           c.complained_count as "complainedCount", c.unsubscribed_count as "unsubscribedCount",
           c.failed_count as "failedCount",
           c.scheduled_at as "scheduledAt", c.started_at as "startedAt",
           c.completed_at as "completedAt", c.created_at as "createdAt"
    FROM email_campaigns c
    LEFT JOIN marketing_segments s ON s.id = c.segment_id
    WHERE c.account_id = ${accountId}::uuid
    ORDER BY c.created_at DESC
    LIMIT 100
  `;

  return Response.json({
    campaigns: (rows as Record<string, unknown>[]).map(serializeCampaign),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    subject?: string;
    templateId?: string;
    segmentId?: string;
    senderId?: string;
  };
  if (!body.name?.trim() || !body.subject?.trim()) {
    return Response.json({ error: 'Name and subject are required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    INSERT INTO email_campaigns (account_id, name, subject, template_id, segment_id, sender_id, created_by)
    VALUES (
      ${accountId}::uuid,
      ${body.name.trim()},
      ${body.subject.trim()},
      ${body.templateId ?? null}::uuid,
      ${body.segmentId ?? null}::uuid,
      ${body.senderId ?? null}::uuid,
      ${auth.userId}::uuid
    )
    RETURNING id, name, subject, status, template_id as "templateId", segment_id as "segmentId",
              total_recipients as "totalRecipients", sent_count as "sentCount",
              delivered_count as "deliveredCount", opened_count as "openedCount",
              clicked_count as "clickedCount", bounced_count as "bouncedCount",
              complained_count as "complainedCount", unsubscribed_count as "unsubscribedCount",
              failed_count as "failedCount", created_at as "createdAt"
  `;

  return Response.json({ campaign: serializeCampaign(rows[0] as Record<string, unknown>) }, { status: 201 });
}
