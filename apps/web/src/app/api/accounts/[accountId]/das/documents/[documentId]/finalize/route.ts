import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { renderAndSaveDocumentHtml } from '@/lib/das/document-render';
import { hashHtml, newVerificationToken, verifyUrlForToken } from '@/lib/das/security';
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
      d.updated_at as "updatedAt"
    FROM das_documents d
    WHERE d.id = ${documentId}::uuid AND d.account_id = ${accountId}::uuid
    LIMIT 1
  `;

  if (!docs[0]) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  let document = serializeDasDocument(
    docs[0] as Parameters<typeof serializeDasDocument>[0]
  );

  if (document.status !== 'approved' && document.status !== 'finalized') {
    return Response.json(
      { error: 'Document must be approved before finalizing' },
      { status: 400 }
    );
  }

  if (document.status === 'finalized') {
    const existingSec = await sql`
      SELECT
        verification_token as "verificationToken",
        sha256_hash as "sha256Hash",
        signature_metadata as "signatureMetadata"
      FROM das_document_security
      WHERE document_id = ${documentId}::uuid
      LIMIT 1
    `;
    if (existingSec[0]) {
      const sec = existingSec[0] as {
        verificationToken: string;
        sha256Hash: string;
        signatureMetadata: Record<string, unknown> | null;
      };
      const metaArtifact =
        typeof sec.signatureMetadata?.artifactUrl === 'string'
          ? sec.signatureMetadata.artifactUrl
          : null;
      return Response.json({
        document,
        security: {
          verificationToken: sec.verificationToken,
          sha256Hash: sec.sha256Hash,
          verifyUrl: verifyUrlForToken(sec.verificationToken, new URL(req.url).origin),
          artifactUrl: metaArtifact,
        },
      });
    }
  }

  let html = document.htmlSnapshot;
  if (!html?.trim()) {
    const rendered = await renderAndSaveDocumentHtml(sql, accountId, documentId);
    if (!rendered) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    document = rendered.document;
    html = rendered.html;
  }

  const sha256Hash = hashHtml(html!);
  const verificationToken = newVerificationToken();
  const verifyUrl = verifyUrlForToken(verificationToken, new URL(req.url).origin);

  let artifactUrl: string | null = null;
  const signatureMetadata: Record<string, unknown> = {};

  if (r2Configured) {
    try {
      const key = `das/documents/${accountId}/${documentId}/${sha256Hash}.html`;
      const uploaded = await putObject(key, Buffer.from(html!, 'utf8'), 'text/html; charset=utf-8');
      artifactUrl = uploaded.publicUrl;
      signatureMetadata.artifactUrl = artifactUrl;
      signatureMetadata.htmlKey = key;
    } catch {
      // Storage optional for finalize — hash/token still recorded
    }
  }

  const securityRows = await sql`
    INSERT INTO das_document_security (
      document_id,
      sha256_hash,
      verification_token,
      qr_payload,
      signature_metadata
    )
    VALUES (
      ${documentId}::uuid,
      ${sha256Hash},
      ${verificationToken},
      ${verifyUrl},
      ${JSON.stringify(signatureMetadata)}::jsonb
    )
    ON CONFLICT (document_id) DO UPDATE SET
      sha256_hash = EXCLUDED.sha256_hash,
      verification_token = EXCLUDED.verification_token,
      qr_payload = EXCLUDED.qr_payload,
      signature_metadata = COALESCE(das_document_security.signature_metadata, '{}'::jsonb)
        || EXCLUDED.signature_metadata
    RETURNING
      verification_token as "verificationToken",
      sha256_hash as "sha256Hash",
      signature_metadata as "signatureMetadata"
  `;

  const security = securityRows[0] as {
    verificationToken: string;
    sha256Hash: string;
    signatureMetadata: Record<string, unknown>;
  };

  const metaArtifact =
    typeof security.signatureMetadata?.artifactUrl === 'string'
      ? security.signatureMetadata.artifactUrl
      : artifactUrl;

  await sql`
    UPDATE das_documents SET
      status = 'finalized',
      finalized_at = COALESCE(finalized_at, NOW()),
      updated_at = NOW()
    WHERE id = ${documentId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'document',
      ${documentId}::uuid,
      'finalized',
      ${auth.userId}::uuid,
      ${JSON.stringify({ sha256Hash })}::jsonb
    )
  `;

  const updated = await sql`
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

  return Response.json({
    document: serializeDasDocument(
      updated[0] as Parameters<typeof serializeDasDocument>[0]
    ),
    security: {
      verificationToken: security.verificationToken,
      sha256Hash: security.sha256Hash,
      verifyUrl: verifyUrlForToken(security.verificationToken, new URL(req.url).origin),
      artifactUrl: metaArtifact,
    },
  });
}
