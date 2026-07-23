import { Badge } from '@/components/ui/badge';
import {
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_COLORS,
  formatDocumentStatus,
  formatDocumentType,
} from '@/lib/das/labels';
import type { DasDocumentStatus, DasDocumentType } from '@/lib/das/types';

export function DocumentStatusBadge({ status }: { status: string }) {
  const key = status as DasDocumentStatus;
  return (
    <Badge color={DOCUMENT_STATUS_COLORS[key] ?? 'gray'}>
      {formatDocumentStatus(status)}
    </Badge>
  );
}

export function DocumentTypeBadge({ type }: { type: string }) {
  const key = type as DasDocumentType;
  return (
    <Badge color={DOCUMENT_TYPE_COLORS[key] ?? 'gray'}>
      {formatDocumentType(type)}
    </Badge>
  );
}
