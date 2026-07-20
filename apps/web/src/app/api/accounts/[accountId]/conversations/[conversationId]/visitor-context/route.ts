import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { countryLabel } from '@/lib/country';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

function parseUserAgent(ua: string | null) {
  if (!ua) return { device: 'Unknown', browser: 'Unknown' };
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  let browser = 'Browser';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  return { device: mobile ? 'Mobile' : 'Desktop', browser };
}

export async function GET(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await authorizeAccount(token, accountId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const conv = await sql`
    SELECT c.contact_id as "contactId", c.inbox_id as "inboxId", c.created_at as "startedAt"
    FROM conversations c
    WHERE c.id = ${conversationId}::uuid AND c.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!conv[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  const { contactId, inboxId } = conv[0] as { contactId: string; inboxId: string };

  const [contact, ci, visits, pastChats] = await Promise.all([
    sql`
      SELECT name, email FROM contacts WHERE id = ${contactId}::uuid LIMIT 1
    `,
    sql`
      SELECT ci.source_id as "sourceId", ci.last_ip_address as "ipAddress",
             ci.country_code as "countryCode",
             ci.last_seen_at as "lastSeenAt", ci.pre_chat_data as "preChatData"
      FROM contact_inboxes ci
      WHERE ci.contact_id = ${contactId}::uuid AND ci.inbox_id = ${inboxId}::uuid
      LIMIT 1
    `,
    sql`
      SELECT page_url as "pageUrl", referrer, user_agent as "userAgent",
             ip_address as "ipAddress", country_code as "countryCode", created_at as "visitedAt"
      FROM inbox_visits
      WHERE inbox_id = ${inboxId}::uuid
        AND (source_id = (SELECT source_id FROM contact_inboxes WHERE contact_id = ${contactId}::uuid AND inbox_id = ${inboxId}::uuid LIMIT 1)
          OR ip_address = (SELECT last_ip_address FROM contact_inboxes WHERE contact_id = ${contactId}::uuid AND inbox_id = ${inboxId}::uuid LIMIT 1))
      ORDER BY created_at DESC
      LIMIT 10
    `,
    sql`
      SELECT id, status, created_at as "createdAt", last_message_at as "lastMessageAt"
      FROM conversations
      WHERE contact_id = ${contactId}::uuid AND inbox_id = ${inboxId}::uuid
      ORDER BY created_at DESC
      LIMIT 10
    `,
  ]);

  const contactRow = contact[0] as { name: string; email: string | null } | undefined;

  const link = ci[0] as {
    sourceId: string;
    ipAddress: string | null;
    countryCode: string | null;
    lastSeenAt: string | null;
    preChatData: Record<string, string>;
  } | undefined;

  const latestVisit = visits[0] as {
    pageUrl: string | null;
    referrer: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    countryCode: string | null;
  } | undefined;

  const ua = parseUserAgent(latestVisit?.userAgent ?? null);
  const countryCode = link?.countryCode ?? latestVisit?.countryCode ?? null;

  return Response.json({
    context: {
      contactName: contactRow?.name ?? null,
      contactEmail: contactRow?.email ?? null,
      pageUrl: latestVisit?.pageUrl ?? null,
      referrer: latestVisit?.referrer ?? null,
      ipAddress: link?.ipAddress ?? latestVisit?.ipAddress ?? null,
      countryCode,
      country: countryLabel(countryCode),
      device: ua.device,
      browser: ua.browser,
      visitCount: visits.length,
      preChatData: link?.preChatData ?? {},
      pastChats,
      lastSeenAt: link?.lastSeenAt ?? null,
    },
  });
}
