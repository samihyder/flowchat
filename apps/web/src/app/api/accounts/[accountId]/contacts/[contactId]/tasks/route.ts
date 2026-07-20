import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; contactId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT t.id, t.title, t.due_at as "dueAt", t.status,
           t.created_at as "createdAt", t.completed_at as "completedAt",
           u.name as "createdByName"
    FROM contact_tasks t
    LEFT JOIN users u ON u.id = t.created_by
    WHERE t.contact_id = ${contactId}::uuid AND t.account_id = ${accountId}::uuid
    ORDER BY (t.status = 'open') DESC, t.due_at ASC NULLS LAST, t.created_at DESC
  `;

  return Response.json({ tasks: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { title?: string; dueAt?: string | null };
  const title = body.title?.trim();
  if (!title) return Response.json({ error: 'Title is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const contact = await sql`
    SELECT id FROM contacts WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!contact[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  const rows = await sql`
    INSERT INTO contact_tasks (account_id, contact_id, title, due_at, created_by)
    VALUES (${accountId}::uuid, ${contactId}::uuid, ${title}, ${body.dueAt ?? null}, ${auth.userId}::uuid)
    RETURNING id, title, due_at as "dueAt", status, created_at as "createdAt", completed_at as "completedAt"
  `;

  return Response.json({ task: rows[0] }, { status: 201 });
}
