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

export const DAS_ASSET_KINDS = [
  'stamp',
  'seal',
  'signature',
  'initials',
  'logo',
  'other',
] as const;

export type DasAssetKind = (typeof DAS_ASSET_KINDS)[number];

export const DAS_PRICE_MODES = ['fixed', 'rollup'] as const;
export type DasPriceMode = (typeof DAS_PRICE_MODES)[number];

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

export type DasBrandProfile = {
  accountId: string;
  legalName: string | null;
  logoUrl: string | null;
  letterheadUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DasAsset = {
  id: string;
  accountId: string;
  ownerUserId: string | null;
  kind: DasAssetKind;
  label: string;
  fileName: string;
  mimeType: string;
  storageKey: string | null;
  publicUrl: string | null;
  signerName: string | null;
  signerTitle: string | null;
  tags: unknown[];
  createdAt: string;
};

export type DasCatalogItem = {
  id: string;
  accountId: string;
  sku: string;
  skuAuto: boolean;
  name: string;
  description: string | null;
  baseUnit: string | null;
  unitPrice: number;
  currency: string;
  priceMode: DasPriceMode;
  createdAt: string;
  updatedAt: string;
};

export const DAS_CATALOG_ITEM_TYPES = ['product', 'service'] as const;
export type DasCatalogItemType = (typeof DAS_CATALOG_ITEM_TYPES)[number];

export type DasCatalogPrice = {
  id: string;
  accountId: string;
  itemType: DasCatalogItemType;
  itemId: string;
  currency: string;
  unitPrice: number;
  createdAt: string;
};

export type DasCatalogComponent = {
  id: string;
  accountId: string;
  parentType: DasCatalogItemType;
  parentId: string;
  childType: DasCatalogItemType;
  childId: string;
  quantity: number;
  label: string | null;
  sortOrder: number;
  createdAt: string;
};

export type DasTemplate = {
  id: string;
  accountId: string;
  name: string;
  type: DasDocumentType;
  version: number;
  body: Record<string, unknown>;
  handlebarsHtml: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DasClient = {
  id: string;
  accountId: string;
  contactId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DasAuditLog = {
  id: string;
  accountId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function isDasDocumentType(value: string): value is DasDocumentType {
  return (DAS_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function isDasDocumentStatus(value: string): value is DasDocumentStatus {
  return (DAS_DOCUMENT_STATUSES as readonly string[]).includes(value);
}

export function isDasAssetKind(value: string): value is DasAssetKind {
  return (DAS_ASSET_KINDS as readonly string[]).includes(value);
}

export function isDasPriceMode(value: string): value is DasPriceMode {
  return (DAS_PRICE_MODES as readonly string[]).includes(value);
}

export function isDasCatalogItemType(value: string): value is DasCatalogItemType {
  return (DAS_CATALOG_ITEM_TYPES as readonly string[]).includes(value);
}

function asIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return new Date(value as Date | string).toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
  return {
    id: row.id,
    accountId: row.accountId,
    contactId: row.contactId,
    clientId: row.clientId,
    templateId: row.templateId,
    type: row.type as DasDocumentType,
    title: row.title,
    status: row.status as DasDocumentStatus,
    structuredData: asObject(row.structuredData),
    htmlSnapshot: row.htmlSnapshot,
    createdBy: row.createdBy,
    finalizedAt: asIso(row.finalizedAt),
    createdAt: asIso(row.createdAt)!,
    updatedAt: asIso(row.updatedAt)!,
    contactName: row.contactName ?? null,
  };
}

export function emptyDasBrandProfile(accountId: string): DasBrandProfile {
  return {
    accountId,
    legalName: null,
    logoUrl: null,
    letterheadUrl: null,
    settings: {},
    createdAt: null,
    updatedAt: null,
  };
}

export function serializeDasBrandProfile(row: {
  accountId: string;
  legalName: string | null;
  logoUrl: string | null;
  letterheadUrl: string | null;
  settings: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}): DasBrandProfile {
  return {
    accountId: row.accountId,
    legalName: row.legalName,
    logoUrl: row.logoUrl,
    letterheadUrl: row.letterheadUrl,
    settings: asObject(row.settings),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export function serializeDasAsset(row: {
  id: string;
  accountId: string;
  ownerUserId: string | null;
  kind: string;
  label: string;
  fileName: string;
  mimeType: string;
  storageKey: string | null;
  publicUrl: string | null;
  signerName: string | null;
  signerTitle: string | null;
  tags: unknown;
  createdAt: Date | string;
}): DasAsset {
  return {
    id: row.id,
    accountId: row.accountId,
    ownerUserId: row.ownerUserId,
    kind: row.kind as DasAssetKind,
    label: row.label,
    fileName: row.fileName,
    mimeType: row.mimeType,
    storageKey: row.storageKey,
    publicUrl: row.publicUrl,
    signerName: row.signerName,
    signerTitle: row.signerTitle,
    tags: asArray(row.tags),
    createdAt: asIso(row.createdAt)!,
  };
}

export function serializeDasCatalogItem(row: {
  id: string;
  accountId: string;
  sku: string;
  skuAuto: boolean;
  name: string;
  description: string | null;
  baseUnit: string | null;
  unitPrice: unknown;
  currency: string;
  priceMode: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}): DasCatalogItem {
  return {
    id: row.id,
    accountId: row.accountId,
    sku: row.sku,
    skuAuto: Boolean(row.skuAuto),
    name: row.name,
    description: row.description,
    baseUnit: row.baseUnit,
    unitPrice: asNumber(row.unitPrice),
    currency: row.currency,
    priceMode: row.priceMode as DasPriceMode,
    createdAt: asIso(row.createdAt)!,
    updatedAt: asIso(row.updatedAt)!,
  };
}

export function serializeDasCatalogPrice(row: {
  id: string;
  accountId: string;
  itemType: string;
  itemId: string;
  currency: string;
  unitPrice: unknown;
  createdAt: Date | string;
}): DasCatalogPrice {
  return {
    id: row.id,
    accountId: row.accountId,
    itemType: row.itemType as DasCatalogItemType,
    itemId: row.itemId,
    currency: row.currency,
    unitPrice: asNumber(row.unitPrice),
    createdAt: asIso(row.createdAt)!,
  };
}

export function serializeDasCatalogComponent(row: {
  id: string;
  accountId: string;
  parentType: string;
  parentId: string;
  childType: string;
  childId: string;
  quantity: unknown;
  label: string | null;
  sortOrder: unknown;
  createdAt: Date | string;
}): DasCatalogComponent {
  return {
    id: row.id,
    accountId: row.accountId,
    parentType: row.parentType as DasCatalogItemType,
    parentId: row.parentId,
    childType: row.childType as DasCatalogItemType,
    childId: row.childId,
    quantity: asNumber(row.quantity),
    label: row.label,
    sortOrder: Math.trunc(asNumber(row.sortOrder)),
    createdAt: asIso(row.createdAt)!,
  };
}

export function serializeDasTemplate(row: {
  id: string;
  accountId: string;
  name: string;
  type: string;
  version: number;
  body: unknown;
  handlebarsHtml: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): DasTemplate {
  return {
    id: row.id,
    accountId: row.accountId,
    name: row.name,
    type: row.type as DasDocumentType,
    version: Number(row.version) || 1,
    body: asObject(row.body),
    handlebarsHtml: row.handlebarsHtml,
    isActive: Boolean(row.isActive),
    createdAt: asIso(row.createdAt)!,
    updatedAt: asIso(row.updatedAt)!,
  };
}

export function serializeDasClient(row: {
  id: string;
  accountId: string;
  contactId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): DasClient {
  return {
    id: row.id,
    accountId: row.accountId,
    contactId: row.contactId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    address: row.address,
    notes: row.notes,
    createdAt: asIso(row.createdAt)!,
    updatedAt: asIso(row.updatedAt)!,
  };
}

export function serializeDasAuditLog(row: {
  id: string;
  accountId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorName?: string | null;
  metadata: unknown;
  createdAt: Date | string;
}): DasAuditLog {
  return {
    id: row.id,
    accountId: row.accountId,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    actorId: row.actorId,
    actorName: row.actorName ?? null,
    metadata: asObject(row.metadata),
    createdAt: asIso(row.createdAt)!,
  };
}

export function autoSku(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
