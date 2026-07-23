import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { hashHtml, newVerificationToken } from '@/lib/das/security';
import { serializeDasDocument } from '@/lib/das/types';
import { putObject, r2Configured } from '@/lib/storage';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; documentId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, documentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const docs = await sql`
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
      s.signature_metadata as "signatureMetadata",
      s.sha256_hash as "sha256Hash"
    FROM das_documents d
    LEFT JOIN das_document_security s ON s.document_id = d.id
    WHERE d.id = ${documentId}::uuid AND d.account_id = ${accountId}::uuid
    LIMIT 1
  `;

  if (!docs[0]) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  const row = docs[0] as Parameters<typeof serializeDasDocument>[0] & {
    signatureMetadata?: Record<string, unknown> | null;
    sha256Hash?: string | null;
  };
  const document = serializeDasDocument(row);

  if (document.status !== 'finalized' && document.status !== 'approved') {
    return Response.json(
      { error: 'Document must be finalized or approved with an HTML snapshot' },
      { status: 400 }
    );
  }

  if (!document.htmlSnapshot?.trim()) {
    return Response.json(
      { error: 'Document has no HTML snapshot; render first' },
      { status: 400 }
    );
  }

  if (!r2Configured) {
    return Response.json({ error: 'File storage is not configured' }, { status: 503 });
  }

  const existingMeta =
    row.signatureMetadata && typeof row.signatureMetadata === 'object'
      ? row.signatureMetadata
      : {};
  const existingPdfUrl =
    typeof existingMeta.pdfUrl === 'string' ? existingMeta.pdfUrl : null;

  if (existingPdfUrl) {
    return Response.json({ pdfUrl: existingPdfUrl, publicUrl: existingPdfUrl });
  }

  const html = document.htmlSnapshot;
  const hash = row.sha256Hash || hashHtml(html);
  const key = `das/documents/${accountId}/${documentId}/${hash}.pdf.html`;

  // Store HTML as a downloadable artifact (PDF generation is compute-bound / deferred)
  const { publicUrl } = await putObject(
    key,
    Buffer.from(html, 'utf8'),
    'text/html; charset=utf-8'
  );

  const nextMeta = {
    ...existingMeta,
    pdfUrl: publicUrl,
    pdfKey: key,
    pdfNote: 'html-artifact',
  };

  const placeholderToken = newVerificationToken();
  await sql`
    INSERT INTO das_document_security (
      document_id,
      sha256_hash,
      verification_token,
      signature_metadata
    )
    VALUES (
      ${documentId}::uuid,
      ${hash},
      ${placeholderToken},
      ${JSON.stringify(nextMeta)}::jsonb
    )
    ON CONFLICT (document_id) DO UPDATE SET
      signature_metadata = COALESCE(das_document_security.signature_metadata, '{}'::jsonb)
        || ${JSON.stringify({ pdfUrl: publicUrl, pdfKey: key, pdfNote: 'html-artifact' })}::jsonb
  `;

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'document',
      ${documentId}::uuid,
      'pdf_artifact',
      ${auth.userId}::uuid,
      ${JSON.stringify({ pdfUrl: publicUrl })}::jsonb
    )
  `;

  return Response.json({ pdfUrl: publicUrl, publicUrl });
}
