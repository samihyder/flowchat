'use client';

import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { mergeTagToken } from '@/lib/marketing/merge-tag-editor';

type Props = {
  label: string;
  tagKey: string;
  title?: string;
  onInsert: (tag: string) => void;
};

export function ComposerMergeChip({ label, tagKey, title, onInsert }: Props) {
  const tag = mergeTagToken(tagKey);

  return (
    <button
      type="button"
      title={title}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-merge-tag', tag);
        e.dataTransfer.setData('text/plain', tag);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onInsert(tag)}
      className="merge-chip-transition bg-primary-surface text-primary border border-primary-border rounded-full px-2.5 py-1 text-xs font-medium hover:bg-primary-container cursor-grab active:cursor-grabbing font-data-mono flex items-center gap-2 group"
    >
      <MarketingIcon
        name="drag_indicator"
        className="text-xs text-gray-400 group-hover:text-primary transition-colors"
      />
      {label}
    </button>
  );
}
