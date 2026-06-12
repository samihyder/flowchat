import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; contactId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT e.id, e.event_type as "eventType", e.subject, e.campaign_id as "campaignId",
           c.name as "campaignName", e.created_at as "createdAt"
    FROM contact_email_events e
    LEFT JOIN email_campaigns c ON c.id = e.campaign_id
    WHERE e.account_id = ${accountId}::uuid AND e.contact_id = ${contactId}::uuid
    ORDER BY e.created_at DESC
    LIMIT 50
  `;

  return Response.json({
    events: (rows as { createdAt: Date }[]).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  });
}
