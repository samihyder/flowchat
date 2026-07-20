import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; templateId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, templateId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const src = await sql`
    SELECT name, subject, html_body, text_body FROM email_templates
    WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!src[0]) return Response.json({ error: 'Not found' }, { status: 404 });
  const t = src[0] as { name: string; subject: string; html_body: string; text_body: string | null };

  const rows = await sql`
    INSERT INTO email_templates (account_id, name, subject, html_body, text_body)
    VALUES (${accountId}::uuid, ${t.name + ' (copy)'}, ${t.subject}, ${t.html_body}, ${t.text_body})
    RETURNING id, name, subject
  `;
  return Response.json({ template: rows[0] }, { status: 201 });
}
