import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await authorizeAccount(token, accountId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return Response.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const pattern = `%${q}%`;

  const byId = await sql`
    SELECT c.id, c.status, c.last_message_at as "lastMessageAt",
           ct.name as "contactName", ct.email as "contactEmail", i.name as "inboxName"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    WHERE c.account_id = ${accountId}::uuid AND c.id::text = ${q}
    LIMIT 5
  `;

  const byContact = await sql`
    SELECT c.id, c.status, c.last_message_at as "lastMessageAt",
           ct.name as "contactName", ct.email as "contactEmail", i.name as "inboxName"
    FROM conversations c
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    WHERE c.account_id = ${accountId}::uuid
      AND (ct.name ILIKE ${pattern} OR ct.email ILIKE ${pattern})
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 20
  `;

  const byMessage = await sql`
    SELECT DISTINCT ON (c.id) c.id, c.status, c.last_message_at as "lastMessageAt",
           ct.name as "contactName", ct.email as "contactEmail", i.name as "inboxName"
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    INNER JOIN contacts ct ON ct.id = c.contact_id
    INNER JOIN inboxes i ON i.id = c.inbox_id
    WHERE c.account_id = ${accountId}::uuid
      AND m.content ILIKE ${pattern}
      AND m.deleted_at IS NULL
    ORDER BY c.id, m.created_at DESC
    LIMIT 20
  `;

  const seen = new Set<string>();
  const results = [];
  for (const row of [...byId, ...byContact, ...byMessage]) {
    const id = (row as { id: string }).id;
    if (seen.has(id)) continue;
    seen.add(id);
    results.push(row);
  }

  return Response.json({ results: results.slice(0, 30) });
}
