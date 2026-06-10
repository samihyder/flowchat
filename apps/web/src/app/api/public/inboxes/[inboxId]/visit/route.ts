import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { getClientIp } from '@/lib/request-ip';
import { publishEvent } from '@/lib/redis';

type Params = { params: Promise<{ inboxId: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503, headers: corsHeaders() });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sourceId?: string;
    pageUrl?: string;
  };

  const sql = neon(databaseUrl);
  const inbox = await sql`
    SELECT id, account_id as "accountId", name
    FROM inboxes WHERE id = ${inboxId}::uuid AND is_enabled = true LIMIT 1
  `;
  const inboxRow = inbox[0] as { id: string; accountId: string; name: string } | undefined;
  if (!inboxRow) {
    return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') ?? null;
  const sourceId = body.sourceId ?? null;

  let shouldAlarm = false;
  if (sourceId) {
    const recent = await sql`
      SELECT 1 FROM inbox_visits
      WHERE inbox_id = ${inboxId}::uuid
        AND source_id = ${sourceId}
        AND created_at > NOW() - INTERVAL '10 minutes'
      LIMIT 1
    `;
    shouldAlarm = !recent[0];
  }

  await sql`
    INSERT INTO inbox_visits (inbox_id, ip_address, user_agent, source_id, page_url)
    VALUES (
      ${inboxId}::uuid,
      ${ip},
      ${userAgent},
      ${body.sourceId ?? null},
      ${body.pageUrl ?? null}
    )
  `;

  if (sourceId && ip) {
    await sql`
      UPDATE contact_inboxes SET last_ip_address = ${ip}, last_seen_at = NOW()
      WHERE inbox_id = ${inboxId}::uuid AND source_id = ${sourceId}
    `;
  }

  if (shouldAlarm) {
    void publishEvent(`account:${inboxRow.accountId}`, {
      type: 'visitor_online',
      inboxId,
      inboxName: inboxRow.name,
      accountId: inboxRow.accountId,
      ipAddress: ip,
      pageUrl: body.pageUrl ?? null,
      sourceId,
      visitedAt: new Date().toISOString(),
    });
  }

  return Response.json({ ok: true }, { headers: corsHeaders() });
}
