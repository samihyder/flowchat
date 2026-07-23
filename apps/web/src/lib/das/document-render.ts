import type { AppSql } from '@/lib/db-sql';
import {
  buildDasRenderContext,
  renderDocumentHtml,
  type DasRenderContext,
} from '@/lib/das/render';
import { serializeDasDocument } from '@/lib/das/types';

type DocumentRow = Parameters<typeof serializeDasDocument>[0];

export async function loadDocumentForRender(
  sql: AppSql,
  accountId: string,
  documentId: string
): Promise<{
  document: ReturnType<typeof serializeDasDocument>;
  context: DasRenderContext;
  handlebarsHtml: string | null;
} | null> {
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
      c.name as "contactName",
      c.email as "contactEmail",
      c.phone as "contactPhone",
      co.name as "contactCompany",
      cl.name as "clientName",
      cl.email as "clientEmail",
      cl.phone as "clientPhone",
      cl.company as "clientCompany",
      cl.address as "clientAddress",
      b.legal_name as "brandLegalName",
      b.logo_url as "brandLogoUrl",
      b.letterhead_url as "brandLetterheadUrl",
      t.handlebars_html as "handlebarsHtml"
    FROM das_documents d
    LEFT JOIN contacts c ON c.id = d.contact_id
    LEFT JOIN companies co ON co.id = c.company_id
    LEFT JOIN das_clients cl ON cl.id = d.client_id
    LEFT JOIN das_brand_profiles b ON b.account_id = d.account_id
    LEFT JOIN das_templates t ON t.id = d.template_id AND t.account_id = d.account_id
    WHERE d.id = ${documentId}::uuid AND d.account_id = ${accountId}::uuid
    LIMIT 1
  `;

  const row = docs[0] as
    | (DocumentRow & {
        contactEmail?: string | null;
        contactPhone?: string | null;
        contactCompany?: string | null;
        clientName?: string | null;
        clientEmail?: string | null;
        clientPhone?: string | null;
        clientCompany?: string | null;
        clientAddress?: string | null;
        brandLegalName?: string | null;
        brandLogoUrl?: string | null;
        brandLetterheadUrl?: string | null;
        handlebarsHtml?: string | null;
      })
    | undefined;

  if (!row) return null;

  const document = serializeDasDocument(row);
  const context = buildDasRenderContext({
    document: {
      id: document.id,
      title: document.title,
      type: document.type,
      status: document.status,
      structuredData: document.structuredData,
      createdAt: document.createdAt,
      finalizedAt: document.finalizedAt,
    },
    brand: {
      legalName: row.brandLegalName ?? null,
      logoUrl: row.brandLogoUrl ?? null,
      letterheadUrl: row.brandLetterheadUrl ?? null,
    },
    contact: {
      name: row.contactName ?? null,
      email: row.contactEmail ?? null,
      phone: row.contactPhone ?? null,
      company: row.contactCompany ?? null,
    },
    client: {
      name: row.clientName ?? null,
      email: row.clientEmail ?? null,
      phone: row.clientPhone ?? null,
      company: row.clientCompany ?? null,
      address: row.clientAddress ?? null,
    },
  });

  return {
    document,
    context,
    handlebarsHtml: row.handlebarsHtml ?? null,
  };
}

export async function renderAndSaveDocumentHtml(
  sql: AppSql,
  accountId: string,
  documentId: string
): Promise<{
  document: ReturnType<typeof serializeDasDocument>;
  html: string;
} | null> {
  const loaded = await loadDocumentForRender(sql, accountId, documentId);
  if (!loaded) return null;

  const html = renderDocumentHtml(loaded.handlebarsHtml, loaded.context);

  await sql`
    UPDATE das_documents SET
      html_snapshot = ${html},
      updated_at = NOW()
    WHERE id = ${documentId}::uuid AND account_id = ${accountId}::uuid
  `;

  return {
    document: { ...loaded.document, htmlSnapshot: html },
    html,
  };
}
