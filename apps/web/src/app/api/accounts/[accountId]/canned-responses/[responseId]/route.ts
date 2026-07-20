import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; responseId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, responseId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { shortcut?: string; title?: string; content?: string };
  const shortcut = body.shortcut !== undefined ? body.shortcut.trim().toLowerCase() : undefined;
  const title = body.title !== undefined ? body.title.trim() : undefined;
  const content = body.content !== undefined ? body.content.trim() : undefined;

  if (shortcut !== undefined && !shortcut) {
    return Response.json({ error: 'Shortcut cannot be empty' }, { status: 400 });
  }
  if (title !== undefined && !title) {
    return Response.json({ error: 'Title cannot be empty' }, { status: 400 });
  }
  if (content !== undefined && !content) {
    return Response.json({ error: 'Content cannot be empty' }, { status: 400 });
  }
  if (shortcut === undefined && title === undefined && content === undefined) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);

  const existing = await sql`
    SELECT id FROM canned_responses
    WHERE id = ${responseId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing.length) return Response.json({ error: 'Canned response not found' }, { status: 404 });

  if (shortcut) {
    const clash = await sql`
      SELECT id FROM canned_responses
      WHERE account_id = ${accountId}::uuid
        AND lower(shortcut) = lower(${shortcut})
        AND id <> ${responseId}::uuid
      LIMIT 1
    `;
    if (clash.length) {
      return Response.json({ error: 'Shortcut already in use' }, { status: 409 });
    }
  }

  try {
    const rows = await sql`
      UPDATE canned_responses
      SET
        shortcut = COALESCE(${shortcut ?? null}, shortcut),
        title = COALESCE(${title ?? null}, title),
        content = COALESCE(${content ?? null}, content),
        updated_at = now()
      WHERE id = ${responseId}::uuid AND account_id = ${accountId}::uuid
      RETURNING id, shortcut, title, content, created_at as "createdAt"
    `;
    return Response.json({ response: rows[0] });
  } catch {
    return Response.json({ error: 'Failed to update canned response' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, responseId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    DELETE FROM canned_responses
    WHERE id = ${responseId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows.length) return Response.json({ error: 'Canned response not found' }, { status: 404 });
  return Response.json({ ok: true });
}
