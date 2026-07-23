import type { DasDocumentStatus, DasDocumentType } from '@/lib/das/types';
import { DAS_DOCUMENT_STATUSES, DAS_DOCUMENT_TYPES } from '@/lib/das/types';

export const DOCUMENT_TYPE_LABELS: Record<DasDocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  proposal: 'Proposal',
  sla: 'SLA',
  nda: 'NDA',
  other: 'Other',
};

export const DOCUMENT_STATUS_LABELS: Record<DasDocumentStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  finalized: 'Finalized',
  archived: 'Archived',
};

export type BadgeColor = 'primary' | 'accent' | 'gray' | 'success' | 'warning';

export const DOCUMENT_STATUS_COLORS: Record<DasDocumentStatus, BadgeColor> = {
  draft: 'gray',
  pending_approval: 'warning',
  approved: 'primary',
  rejected: 'warning',
  finalized: 'success',
  archived: 'gray',
};

export const DOCUMENT_TYPE_COLORS: Record<DasDocumentType, BadgeColor> = {
  quotation: 'primary',
  invoice: 'accent',
  proposal: 'primary',
  sla: 'gray',
  nda: 'gray',
  other: 'gray',
};

export function formatDocumentType(type: string): string {
  return DOCUMENT_TYPE_LABELS[type as DasDocumentType] ?? type;
}

export function formatDocumentStatus(status: string): string {
  return DOCUMENT_STATUS_LABELS[status as DasDocumentStatus] ?? status;
}

export function documentTypeOptions() {
  return DAS_DOCUMENT_TYPES.map((value) => ({
    value,
    label: DOCUMENT_TYPE_LABELS[value],
  }));
}

export function documentStatusOptions() {
  return DAS_DOCUMENT_STATUSES.map((value) => ({
    value,
    label: DOCUMENT_STATUS_LABELS[value],
  }));
}

/** Allowed next statuses from current status (workflow). */
export function nextDocumentStatuses(
  status: DasDocumentStatus,
  opts?: { wasFinalized?: boolean }
): DasDocumentStatus[] {
  switch (status) {
    case 'draft':
      return ['pending_approval', 'archived'];
    case 'pending_approval':
      return ['approved', 'rejected', 'draft'];
    case 'approved':
      // Finalize is a dedicated API (hash + verify token) — not a plain status PATCH.
      return ['archived'];
    case 'rejected':
      return ['draft', 'archived'];
    case 'finalized':
      return ['archived'];
    case 'archived':
      return opts?.wasFinalized ? [] : ['draft'];
    default:
      return [];
  }
}

export function isAllowedDocumentTransition(
  from: DasDocumentStatus,
  to: DasDocumentStatus,
  opts?: { wasFinalized?: boolean }
): boolean {
  if (from === to) return true;
  if (to === 'finalized') return false;
  return nextDocumentStatuses(from, opts).includes(to);
}

/** Action-oriented labels for workflow chips. */
export const DOCUMENT_WORKFLOW_ACTIONS: Record<DasDocumentStatus, string> = {
  draft: 'Return to draft',
  pending_approval: 'Submit for approval',
  approved: 'Approve',
  rejected: 'Reject',
  finalized: 'Finalize',
  archived: 'Archive',
};

export function formatWorkflowAction(status: DasDocumentStatus): string {
  return DOCUMENT_WORKFLOW_ACTIONS[status] ?? formatDocumentStatus(status);
}
