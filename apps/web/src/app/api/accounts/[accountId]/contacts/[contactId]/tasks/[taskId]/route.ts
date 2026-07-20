import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; contactId: string; taskId: string }> };

const VALID_STATUS = ['open', 'done'] as const;

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, contactId, taskId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { title?: string; dueAt?: string | null; status?: string };
  if (body.status && !VALID_STATUS.includes(body.status as (typeof VALID_STATUS)[number])) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    UPDATE contact_tasks SET
      title = COALESCE(${body.title?.trim() ?? null}, title),
      due_at = CASE WHEN ${body.dueAt !== undefined} THEN ${body.dueAt ?? null} ELSE due_at END,
      status = COALESCE(${body.status ?? null}, status),
      completed_at = CASE WHEN ${body.status === 'done'} THEN NOW()
                          WHEN ${body.status === 'open'} THEN NULL
                          ELSE completed_at END
    WHERE id = ${taskId}::uuid AND contact_id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, title, due_at as "dueAt", status, created_at as "createdAt", completed_at as "completedAt"
  `;
  if (!rows[0]) return Response.json({ error: 'Task not found' }, { status: 404 });

  return Response.json({ task: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, contactId, taskId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const result = await sql`
    DELETE FROM contact_tasks
    WHERE id = ${taskId}::uuid AND contact_id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!result[0]) return Response.json({ error: 'Task not found' }, { status: 404 });

  return Response.json({ ok: true });
}
