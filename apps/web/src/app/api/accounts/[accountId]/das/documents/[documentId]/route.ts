import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isAllowedDocumentTransition } from '@/lib/das/labels';
import { verifyUrlForToken } from '@/lib/das/security';
import {
  isDasDocumentStatus,
  serializeDasDocument,
  type DasDocumentStatus,
} from '@/lib/das/types';
import type { AppSql } from '@/lib/db-sql';
import { neon } from '@/lib/neon';

type Params = { params: Promise<{ accountId: string; documentId: string }> };

async function fetchDocument(sql: AppSql, accountId: string, documentId: string) {
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
  return rows[0] ?? null;
}

export async function GET(_req: Request, { params }: Params) {
  const { accountId, documentId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const row = await fetchDocument(sql, accountId, documentId);

  if (!row) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  const document = serializeDasDocument(
    row as Parameters<typeof serializeDasDocument>[0]
  );

  let security: {
    verificationToken: string;
    sha256Hash: string;
    verifyUrl: string;
    artifactUrl: string | null;
  } | null = null;

  if (document.status === 'finalized' || document.finalizedAt) {
    const secRows = await sql`
      SELECT
        verification_token as "verificationToken",
        sha256_hash as "sha256Hash",
        signature_metadata as "signatureMetadata"
      FROM das_document_security
      WHERE document_id = ${documentId}::uuid
      LIMIT 1
    `;
    if (secRows[0]) {
      const sec = secRows[0] as {
        verificationToken: string;
        sha256Hash: string;
        signatureMetadata: Record<string, unknown> | null;
      };
      security = {
        verificationToken: sec.verificationToken,
        sha256Hash: sec.sha256Hash,
        verifyUrl: verifyUrlForToken(sec.verificationToken, new URL(_req.url).origin),
        artifactUrl:
          typeof sec.signatureMetadata?.artifactUrl === 'string'
            ? sec.signatureMetadata.artifactUrl
            : null,
      };
    }
  }

  return Response.json({ document, security });
}

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, documentId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    title?: string;
    status?: string;
    contactId?: string | null;
    clientId?: string | null;
    templateId?: string | null;
    structuredData?: Record<string, unknown>;
  };

  if ('htmlSnapshot' in (body as Record<string, unknown>)) {
    return Response.json(
      { error: 'htmlSnapshot cannot be set via PATCH; use render or finalize' },
      { status: 400 }
    );
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await fetchDocument(sql, accountId, documentId);
  if (!existing) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  const current = serializeDasDocument(
    existing as Parameters<typeof serializeDasDocument>[0]
  );

  if (current.status === 'finalized') {
    const mutatingContent =
      body.title !== undefined ||
      body.structuredData !== undefined ||
      body.templateId !== undefined ||
      body.contactId !== undefined ||
      body.clientId !== undefined;
    if (mutatingContent || (body.status !== undefined && body.status !== 'archived')) {
      return Response.json(
        {
          error:
            'Finalized documents are locked. Archive only, or create a new document revision.',
        },
        { status: 409 }
      );
    }
  }

  let nextTitle = current.title;
  if (body.title !== undefined) {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return Response.json({ error: 'title cannot be empty' }, { status: 400 });
    }
    nextTitle = trimmed;
  }

  let nextStatus: DasDocumentStatus = current.status;
  if (body.status !== undefined) {
    if (!isDasDocumentStatus(body.status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (body.status === 'finalized') {
      return Response.json(
        { error: 'Use POST …/finalize to finalize a document' },
        { status: 400 }
      );
    }
    if (
      !isAllowedDocumentTransition(current.status, body.status, {
        wasFinalized: Boolean(current.finalizedAt),
      })
    ) {
      return Response.json(
        {
          error: `Cannot transition from ${current.status} to ${body.status}`,
        },
        { status: 400 }
      );
    }
    nextStatus = body.status;
  }

  let nextContactId = current.contactId;
  if (body.contactId !== undefined) {
    if (body.contactId) {
      const contacts = await sql`
        SELECT id FROM contacts
        WHERE id = ${body.contactId}::uuid AND account_id = ${accountId}::uuid
        LIMIT 1
      `;
      if (!contacts[0]) {
        return Response.json({ error: 'Contact not found' }, { status: 404 });
      }
      nextContactId = body.contactId;
    } else {
      nextContactId = null;
    }
  }

  let nextClientId = current.clientId;
  if (body.clientId !== undefined) {
    if (body.clientId) {
      const clients = await sql`
        SELECT id FROM das_clients
        WHERE id = ${body.clientId}::uuid AND account_id = ${accountId}::uuid
        LIMIT 1
      `;
      if (!clients[0]) {
        return Response.json({ error: 'Client not found' }, { status: 404 });
      }
      nextClientId = body.clientId;
    } else {
      nextClientId = null;
    }
  }

  let nextTemplateId = current.templateId;
  if (body.templateId !== undefined) {
    if (body.templateId) {
      const templates = await sql`
        SELECT id FROM das_templates
        WHERE id = ${body.templateId}::uuid AND account_id = ${accountId}::uuid
        LIMIT 1
      `;
      if (!templates[0]) {
        return Response.json({ error: 'Template not found' }, { status: 404 });
      }
      nextTemplateId = body.templateId;
    } else {
      nextTemplateId = null;
    }
  }

  const nextStructuredData =
    body.structuredData !== undefined
      ? body.structuredData &&
        typeof body.structuredData === 'object' &&
        !Array.isArray(body.structuredData)
        ? body.structuredData
        : {}
      : current.structuredData;

  const nowIso = new Date().toISOString();
  const nextSubmittedAt =
    nextStatus === 'pending_approval' && current.status !== 'pending_approval'
      ? nowIso
      : undefined;
  const nextSubmittedBy =
    nextSubmittedAt !== undefined ? auth.userId : undefined;
  const nextApprovedAt =
    nextStatus === 'approved' && current.status !== 'approved' ? nowIso : undefined;
  const nextApprovedBy = nextApprovedAt !== undefined ? auth.userId : undefined;

  await sql`
    UPDATE das_documents SET
      title = ${nextTitle},
      status = ${nextStatus},
      contact_id = ${nextContactId}::uuid,
      client_id = ${nextClientId}::uuid,
      template_id = ${nextTemplateId}::uuid,
      structured_data = ${JSON.stringify(nextStructuredData)}::jsonb,
      submitted_at = COALESCE(${nextSubmittedAt ?? null}::timestamptz, submitted_at),
      submitted_by = COALESCE(${nextSubmittedBy ?? null}::uuid, submitted_by),
      approved_at = COALESCE(${nextApprovedAt ?? null}::timestamptz, approved_at),
      approved_by = COALESCE(${nextApprovedBy ?? null}::uuid, approved_by),
      updated_at = NOW()
    WHERE id = ${documentId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`
    INSERT INTO das_audit_logs (account_id, entity_type, entity_id, action, actor_id, metadata)
    VALUES (
      ${accountId}::uuid,
      'document',
      ${documentId}::uuid,
      'updated',
      ${auth.userId}::uuid,
      ${JSON.stringify({
        title: nextTitle,
        status: nextStatus,
        contactId: nextContactId,
        clientId: nextClientId,
        templateId: nextTemplateId,
        previousStatus: current.status,
        structuredDataUpdated: body.structuredData !== undefined,
      })}::jsonb
    )
  `;

  const row = await fetchDocument(sql, accountId, documentId);
  return Response.json({
    document: serializeDasDocument(
      row as Parameters<typeof serializeDasDocument>[0]
    ),
  });
}
