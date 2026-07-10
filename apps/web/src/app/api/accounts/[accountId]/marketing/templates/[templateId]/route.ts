import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { MarketingError, MarketingErrorCode, marketingErrorResponse } from '@/lib/marketing/errors';
import { htmlToPlainText } from '@/lib/marketing/merge-tags';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; templateId: string }> };
const VALID_CATEGORIES = ['welcome', 'promotional', 'nurture', 'transactional'];

function rejectAttachments(body: Record<string, unknown>) {
  if ('attachments' in body && body.attachments != null) {
    throw new MarketingError(MarketingErrorCode.ATTACHMENTS_NOT_ALLOWED);
  }
}

export async function GET(req: Request, { params }: Params) {
  const { accountId, templateId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT id, name, subject, html_body as "htmlBody", text_body as "textBody", archived, category,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM email_templates
    WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!rows[0]) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ template: rows[0] });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { accountId, templateId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json()) as {
      archived?: boolean;
      textBody?: string;
      htmlBody?: string;
      subject?: string;
      name?: string;
      category?: string | null;
      attachments?: unknown;
    };
    rejectAttachments(body);

    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }

    const textBody =
      body.textBody !== undefined
        ? body.textBody
        : body.htmlBody !== undefined
          ? htmlToPlainText(body.htmlBody)
          : null;

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const rows = await sql`
      UPDATE email_templates SET
        archived = COALESCE(${body.archived ?? null}, archived),
        text_body = COALESCE(${textBody}, text_body),
        html_body = COALESCE(${body.htmlBody ?? null}, html_body),
        subject = COALESCE(${body.subject?.trim() ?? null}, subject),
        name = COALESCE(${body.name?.trim() ?? null}, name),
        category = CASE WHEN ${body.category !== undefined} THEN ${body.category ?? null} ELSE category END,
        updated_at = NOW()
      WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
      RETURNING id, name, subject, html_body as "htmlBody", text_body as "textBody", archived, category,
                updated_at as "updatedAt"
    `;
    if (!rows[0]) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ template: rows[0] });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
