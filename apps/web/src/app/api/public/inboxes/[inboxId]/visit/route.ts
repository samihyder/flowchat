import { neon } from '@neondatabase/serverless';
import { corsHeaders, optionsResponse } from '@/lib/cors';
import { getClientIp } from '@/lib/request-ip';

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
    SELECT id FROM inboxes WHERE id = ${inboxId}::uuid AND is_enabled = true LIMIT 1
  `;
  if (!inbox[0]) {
    return Response.json({ error: 'Inbox not found' }, { status: 404, headers: corsHeaders() });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') ?? null;

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

  if (body.sourceId && ip) {
    await sql`
      UPDATE contact_inboxes SET last_ip_address = ${ip}, last_seen_at = NOW()
      WHERE inbox_id = ${inboxId}::uuid AND source_id = ${body.sourceId}
    `;
  }

  return Response.json({ ok: true }, { headers: corsHeaders() });
}
