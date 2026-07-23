import { neon } from '@/lib/neon';
import { hashHtml } from '@/lib/das/security';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!token?.trim()) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT
      s.verification_token as "verificationToken",
      s.sha256_hash as "sha256Hash",
      s.qr_payload as "qrPayload",
      s.signature_metadata as "signatureMetadata",
      s.created_at as "securityCreatedAt",
      d.id as "documentId",
      d.title,
      d.type,
      d.status,
      d.finalized_at as "finalizedAt",
      d.html_snapshot as "htmlSnapshot",
      d.account_id as "accountId",
      b.legal_name as "brandLegalName"
    FROM das_document_security s
    INNER JOIN das_documents d ON d.id = s.document_id
    LEFT JOIN das_brand_profiles b ON b.account_id = d.account_id
    WHERE s.verification_token = ${token}
    LIMIT 1
  `;

  if (!rows[0]) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const row = rows[0] as {
    verificationToken: string;
    sha256Hash: string;
    qrPayload: string | null;
    signatureMetadata: Record<string, unknown> | null;
    securityCreatedAt: Date | string;
    documentId: string;
    title: string;
    type: string;
    status: string;
    finalizedAt: Date | string | null;
    htmlSnapshot: string | null;
    accountId: string;
    brandLegalName: string | null;
  };

  const html = row.htmlSnapshot ?? '';
  const hashMatches = html ? hashHtml(html) === row.sha256Hash : false;
  const truncated =
    html.length > 50_000 ? `${html.slice(0, 50_000)}\n<!-- truncated -->` : html;

  const meta =
    row.signatureMetadata && typeof row.signatureMetadata === 'object'
      ? row.signatureMetadata
      : {};

  return Response.json({
    valid: row.status === 'finalized' && hashMatches,
    hashMatches,
    verificationToken: row.verificationToken,
    sha256Hash: row.sha256Hash,
    document: {
      id: row.documentId,
      title: row.title,
      type: row.type,
      status: row.status,
      finalizedAt: row.finalizedAt
        ? new Date(row.finalizedAt as Date | string).toISOString()
        : null,
      htmlSnapshot: truncated || null,
    },
    brand: {
      legalName: row.brandLegalName,
    },
    artifactUrl:
      typeof meta.artifactUrl === 'string'
        ? meta.artifactUrl
        : typeof meta.pdfUrl === 'string'
          ? meta.pdfUrl
          : null,
    verifiedAt: new Date().toISOString(),
  });
}
