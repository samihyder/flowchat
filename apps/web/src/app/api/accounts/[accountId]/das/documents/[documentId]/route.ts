import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { serializeDasDocument } from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; documentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId, documentId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      d.id,
      d.account_id as "accountId",
      d.contact_id as "contactId",
      d.client_id as "clientId",
      d.template_id as "templateId",
      d.type,
      d.title,
      d.status,
      d.structured_data as "structuredData",
      d.html_snapshot as "htmlSnapshot",
      d.created_by as "createdBy",
      d.finalized_at as "finalizedAt",
      d.created_at as "createdAt",
      d.updated_at as "updatedAt",
      c.name as "contactName"
    FROM das_documents d
    LEFT JOIN contacts c ON c.id = d.contact_id
    WHERE d.id = ${documentId}::uuid AND d.account_id = ${accountId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  return Response.json({
    document: serializeDasDocument(
      rows[0] as Parameters<typeof serializeDasDocument>[0]
    ),
  });
}
