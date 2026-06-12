import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; contactId: string; noteId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, contactId, noteId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content) return Response.json({ error: 'Content is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    UPDATE contact_notes SET content = ${content}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND contact_id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, content, created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) return Response.json({ error: 'Note not found' }, { status: 404 });

  return Response.json({ note: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, contactId, noteId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    DELETE FROM contact_notes
    WHERE id = ${noteId}::uuid AND contact_id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!result[0]) return Response.json({ error: 'Note not found' }, { status: 404 });

  return Response.json({ ok: true });
}
