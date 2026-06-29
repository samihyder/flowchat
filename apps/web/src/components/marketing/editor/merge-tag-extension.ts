import { Node, mergeAttributes } from '@tiptap/core';

/** Inline merge-tag chip node — serializes to `{{key}}` via renderText. */
export const MergeTagNode = Node.create({
  name: 'mergeTag',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-merge-tag'),
        renderHTML: (attrs: { key?: string | null }) => ({ 'data-merge-tag': attrs.key }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-tag]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-merge-tag': node.attrs.key,
        class: 'merge-tag-chip',
        contenteditable: 'false',
      }),
      String(node.attrs.key ?? ''),
    ];
  },

  renderText({ node }) {
    const key = node.attrs.key as string | null;
    return key ? `{{${key}}}` : '';
  },
});
