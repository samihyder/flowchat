export const DAS_DOCUMENT_TYPES = [
  'quotation',
  'invoice',
  'proposal',
  'sla',
  'nda',
  'other',
] as const;

export type DasDocumentType = (typeof DAS_DOCUMENT_TYPES)[number];

export const DAS_DOCUMENT_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'finalized',
  'archived',
] as const;

export type DasDocumentStatus = (typeof DAS_DOCUMENT_STATUSES)[number];

export type DasDocument = {
  id: string;
  accountId: string;
  contactId: string | null;
  clientId: string | null;
  templateId: string | null;
  type: DasDocumentType;
  title: string;
  status: DasDocumentStatus;
  structuredData: Record<string, unknown>;
  htmlSnapshot: string | null;
  createdBy: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contactName?: string | null;
};

export function isDasDocumentType(value: string): value is DasDocumentType {
  return (DAS_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function serializeDasDocument(row: {
  id: string;
  accountId: string;
  contactId: string | null;
  clientId: string | null;
  templateId: string | null;
  type: string;
  title: string;
  status: string;
  structuredData: unknown;
  htmlSnapshot: string | null;
  createdBy: string | null;
  finalizedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  contactName?: string | null;
}): DasDocument {
  const structured =
    row.structuredData && typeof row.structuredData === 'object'
      ? (row.structuredData as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    accountId: row.accountId,
    contactId: row.contactId,
    clientId: row.clientId,
    templateId: row.templateId,
    type: row.type as DasDocumentType,
    title: row.title,
    status: row.status as DasDocumentStatus,
    structuredData: structured,
    htmlSnapshot: row.htmlSnapshot,
    createdBy: row.createdBy,
    finalizedAt: row.finalizedAt
      ? new Date(row.finalizedAt as Date | string).toISOString()
      : null,
    createdAt: new Date(row.createdAt as Date | string).toISOString(),
    updatedAt: new Date(row.updatedAt as Date | string).toISOString(),
    contactName: row.contactName ?? null,
  };
}
