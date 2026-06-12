import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, name, subject, created_at as "createdAt", updated_at as "updatedAt"
    FROM email_templates WHERE account_id = ${accountId}::uuid
    ORDER BY updated_at DESC
  `;
  return Response.json({ templates: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
  };
  if (!body.name?.trim() || !body.subject?.trim() || !body.htmlBody?.trim()) {
    return Response.json({ error: 'Name, subject, and HTML body are required' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    INSERT INTO email_templates (account_id, name, subject, html_body, text_body)
    VALUES (
      ${accountId}::uuid,
      ${body.name.trim()},
      ${body.subject.trim()},
      ${body.htmlBody},
      ${body.textBody ?? null}
    )
    RETURNING id, name, subject, html_body as "htmlBody", text_body as "textBody"
  `;
  return Response.json({ template: rows[0] }, { status: 201 });
}
