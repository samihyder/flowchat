import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await authorizeAccount(token, accountId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim().toLowerCase();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = q
    ? await sql`
        SELECT cr.id, cr.shortcut, cr.title, cr.content, cr.created_at as "createdAt",
               u.name as "createdByName"
        FROM canned_responses cr
        LEFT JOIN users u ON u.id = cr.created_by
        WHERE cr.account_id = ${accountId}::uuid
          AND (LOWER(cr.shortcut) LIKE ${`%${q}%`} OR LOWER(cr.title) LIKE ${`%${q}%`})
        ORDER BY cr.shortcut ASC
        LIMIT 50
      `
    : await sql`
        SELECT cr.id, cr.shortcut, cr.title, cr.content, cr.created_at as "createdAt",
               u.name as "createdByName"
        FROM canned_responses cr
        LEFT JOIN users u ON u.id = cr.created_by
        WHERE cr.account_id = ${accountId}::uuid
        ORDER BY cr.shortcut ASC
      `;

  return Response.json({ responses: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { shortcut?: string; title?: string; content?: string };
  const shortcut = body.shortcut?.trim().toLowerCase();
  const title = body.title?.trim();
  const content = body.content?.trim();

  if (!shortcut || !title || !content) {
    return Response.json({ error: 'shortcut, title, and content are required' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  try {
    const rows = await sql`
      INSERT INTO canned_responses (account_id, shortcut, title, content, created_by)
      VALUES (${accountId}::uuid, ${shortcut}, ${title}, ${content}, ${auth.userId}::uuid)
      RETURNING id, shortcut, title, content
    `;
    return Response.json({ response: rows[0] }, { status: 201 });
  } catch {
    return Response.json({ error: 'Shortcut already exists' }, { status: 409 });
  }
}
