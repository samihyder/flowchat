import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { MarketingError, MarketingErrorCode, marketingErrorResponse } from '@/lib/marketing/errors';
import { htmlToPlainText } from '@/lib/marketing/merge-tags';

type Params = { params: Promise<{ accountId: string }> };

function rejectAttachments(body: Record<string, unknown>) {
  if ('attachments' in body && body.attachments != null) {
    throw new MarketingError(MarketingErrorCode.ATTACHMENTS_NOT_ALLOWED);
  }
}

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, name, subject, html_body as "htmlBody", text_body as "textBody",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM email_templates WHERE account_id = ${accountId}::uuid AND archived = false
    ORDER BY updated_at DESC
  `;
  return Response.json({ templates: rows });
}

export async function POST(req: Request, { params }: Params) {
  try {
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
      attachments?: unknown;
    };
    rejectAttachments(body);

    if (!body.name?.trim() || !body.subject?.trim() || !body.htmlBody?.trim()) {
      return Response.json({ error: 'Name, subject, and HTML body are required' }, { status: 400 });
    }

    const textBody = body.textBody?.trim() || htmlToPlainText(body.htmlBody);

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      INSERT INTO email_templates (account_id, name, subject, html_body, text_body)
      VALUES (
        ${accountId}::uuid,
        ${body.name.trim()},
        ${body.subject.trim()},
        ${body.htmlBody},
        ${textBody}
      )
      RETURNING id, name, subject, html_body as "htmlBody", text_body as "textBody",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    return Response.json({ template: rows[0] }, { status: 201 });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
