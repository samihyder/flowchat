import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { RECOMMENDED_CANNED_RESPONSES } from '@/lib/canned-responses/defaults';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  let created = 0;
  let skipped = 0;

  for (const def of RECOMMENDED_CANNED_RESPONSES) {
    const existing = await sql`
      SELECT id FROM canned_responses
      WHERE account_id = ${accountId}::uuid AND lower(shortcut) = lower(${def.shortcut})
      LIMIT 1
    `;

    if (existing.length) {
      skipped++;
      continue;
    }

    await sql`
      INSERT INTO canned_responses (account_id, shortcut, title, content, created_by)
      VALUES (
        ${accountId}::uuid,
        ${def.shortcut},
        ${def.title},
        ${def.content},
        ${auth.userId}::uuid
      )
    `;
    created++;
  }

  const rows = await sql`
    SELECT id, shortcut, title, content, created_at as "createdAt"
    FROM canned_responses
    WHERE account_id = ${accountId}::uuid
    ORDER BY shortcut ASC
  `;

  return Response.json({
    ok: true,
    created,
    skipped,
    responses: rows,
  });
}
