import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { validateAssignment } from '@/lib/assign';
import { emitContactEvent } from '@/lib/contact-sync';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    contactIds?: string[];
    assigneeId?: string | null;
    teamId?: string | null;
  };

  const contactIds = (body.contactIds ?? []).filter(Boolean);
  if (contactIds.length === 0) {
    return Response.json({ error: 'contactIds is required' }, { status: 400 });
  }
  if (body.assigneeId === undefined && body.teamId === undefined) {
    return Response.json({ error: 'assigneeId or teamId is required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const assignmentError = await validateAssignment(sql, accountId, {
    assigneeId: body.assigneeId,
    teamId: body.teamId,
  });
  if (assignmentError) return Response.json({ error: assignmentError }, { status: 400 });

  const rows = await sql`
    UPDATE contacts SET
      assignee_id = CASE WHEN ${body.assigneeId !== undefined} THEN ${body.assigneeId ?? null}::uuid ELSE assignee_id END,
      team_id = CASE WHEN ${body.teamId !== undefined} THEN ${body.teamId ?? null}::uuid ELSE team_id END,
      updated_at = NOW()
    WHERE account_id = ${accountId}::uuid AND id = ANY(${contactIds}::uuid[])
    RETURNING id
  `;

  for (const row of rows as { id: string }[]) {
    await emitContactEvent(sql, accountId, 'contact.updated', { id: row.id });
  }

  return Response.json({ ok: true, updatedCount: rows.length });
}
