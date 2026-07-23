import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { renderAndSaveDocumentHtml } from '@/lib/das/document-render';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; documentId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, documentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const existing = await sql`
    SELECT id, status FROM das_documents
    WHERE id = ${documentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing[0]) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }
  if ((existing[0] as { status: string }).status === 'finalized') {
    return Response.json(
      { error: 'Finalized documents cannot be re-rendered' },
      { status: 409 }
    );
  }

  const result = await renderAndSaveDocumentHtml(sql, accountId, documentId);
  if (!result) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'document',
      ${documentId}::uuid,
      'rendered',
      ${auth.userId}::uuid,
      '{}'::jsonb
    )
  `;

  return Response.json({ document: result.document, html: result.html });
}
