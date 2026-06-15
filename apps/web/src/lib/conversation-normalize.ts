import type { Conversation, Label } from '@/lib/api';

/** Neon/pg may return json_agg as a JSON string — normalize before UI .map() calls. */
export function asLabelArray(labels: unknown): Label[] {
  if (Array.isArray(labels)) {
    return labels.filter(
      (l): l is Label =>
        !!l &&
        typeof l === 'object' &&
        typeof (l as Label).id === 'string' &&
        typeof (l as Label).name === 'string'
    );
  }
  if (typeof labels === 'string') {
    try {
      const parsed = JSON.parse(labels) as unknown;
      return asLabelArray(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeConversation(row: Record<string, unknown>): Conversation {
  return {
    ...(row as Conversation),
    contactName: (row.contactName as string | null) ?? 'Visitor',
    unreadCount: Number(row.unreadCount) || 0,
    labels: asLabelArray(row.labels),
    lastMessagePreview:
      typeof row.lastMessagePreview === 'string' ? row.lastMessagePreview : null,
  };
}

export function normalizeConversations(rows: unknown[]): Conversation[] {
  return rows.map((row) => normalizeConversation(row as Record<string, unknown>));
}
