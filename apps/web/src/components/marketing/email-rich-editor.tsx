'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

const MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'First name' },
  { tag: '{{name}}', label: 'Name' },
  { tag: '{{email}}', label: 'Email' },
];

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  hideMergeTags?: boolean;
  onInsertTag?: (insert: (tag: string) => void) => void;
};

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded border ${
        active
          ? 'bg-primary-100 border-primary-300 text-primary-800'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

export function EmailRichEditor({
  value,
  onChange,
  placeholder,
  minHeight = '180px',
  hideMergeTags = false,
  onInsertTag,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary-600 underline' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write your email…' }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm text-gray-800 min-h-[120px]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="border border-gray-200 rounded-lg bg-gray-50 animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  const insertTag = (tag: string) => {
    editor.chain().focus().insertContent(tag).run();
  };

  useEffect(() => {
    if (editor && onInsertTag) {
      onInsertTag(insertTag);
    }
  }, [editor, onInsertTag]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          Link
        </ToolbarButton>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {!hideMergeTags &&
          MERGE_TAGS.map((m) => (
            <button
              key={m.tag}
              type="button"
              onClick={() => insertTag(m.tag)}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
            >
              {m.tag}
            </button>
          ))}
      </div>
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** Plain-text preview from HTML for list views */
export function htmlToPlainPreview(html: string, maxLen = 80): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}
