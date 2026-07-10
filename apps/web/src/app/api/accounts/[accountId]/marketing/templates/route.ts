import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { MarketingError, MarketingErrorCode, marketingErrorResponse } from '@/lib/marketing/errors';
import { htmlToPlainText } from '@/lib/marketing/merge-tags';

type Params = { params: Promise<{ accountId: string }> };
const VALID_CATEGORIES = ['welcome', 'promotional', 'nurture', 'transactional'];

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
    SELECT t.id, t.name, t.subject, t.html_body as "htmlBody", t.text_body as "textBody",
           t.category,
           t.created_at as "createdAt", t.updated_at as "updatedAt",
           (SELECT COUNT(DISTINCT cs.campaign_id)::int
            FROM marketing_campaign_steps cs
            WHERE cs.source_template_id = t.id) as "campaignCount"
    FROM email_templates t WHERE t.account_id = ${accountId}::uuid AND t.archived = false
    ORDER BY t.updated_at DESC
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
      category?: string;
      attachments?: unknown;
    };
    rejectAttachments(body);

    if (!body.name?.trim() || !body.subject?.trim() || !body.htmlBody?.trim()) {
      return Response.json({ error: 'Name, subject, and HTML body are required' }, { status: 400 });
    }
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }

    const textBody = body.textBody?.trim() || htmlToPlainText(body.htmlBody);

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      INSERT INTO email_templates (account_id, name, subject, html_body, text_body, category)
      VALUES (
        ${accountId}::uuid,
        ${body.name.trim()},
        ${body.subject.trim()},
        ${body.htmlBody},
        ${textBody},
        ${body.category ?? null}
      )
      RETURNING id, name, subject, html_body as "htmlBody", text_body as "textBody", category,
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    return Response.json({ template: rows[0] }, { status: 201 });
  } catch (err) {
    return marketingErrorResponse(err);
  }
}
