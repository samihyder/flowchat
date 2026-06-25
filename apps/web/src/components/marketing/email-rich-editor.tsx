'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

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
  variant?: 'default' | 'composer';
};

function ToolbarIconButton({
  onClick,
  active,
  title,
  icon,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-primary-surface text-primary' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <MarketingIcon name={icon} className="text-[20px]" />
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
  variant = 'default',
}: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write your email…' }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          variant === 'composer'
            ? 'prose prose-sm max-w-none focus:outline-none text-lg leading-relaxed text-gray-800 min-h-[400px]'
            : 'prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm text-gray-800 min-h-[120px]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html);
      setHtmlSource(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
      setHtmlSource(value || '<p></p>');
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
    if (htmlMode) {
      const next = `${htmlSource}${tag}`;
      setHtmlSource(next);
      onChange(next);
      return;
    }
    editor.chain().focus().insertContent(tag).run();
  };

  useEffect(() => {
    if (editor && onInsertTag) {
      onInsertTag(insertTag);
    }
  }, [editor, onInsertTag, htmlMode, htmlSource]);

  const toolbar = (
    <div
      className={`flex flex-wrap items-center gap-1 ${
        variant === 'composer'
          ? 'sticky top-0 bg-white border-b border-gray-100 px-6 py-3 z-10'
          : 'px-2 py-1.5 border-b border-gray-100 bg-gray-50'
      }`}
    >
      <div className="flex items-center border-r border-gray-200 pr-3 gap-0.5 mr-1">
        <ToolbarIconButton
          title="Bold"
          icon="format_bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarIconButton
          title="Italic"
          icon="format_italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
      </div>
      <div className="flex items-center border-r border-gray-200 pr-3 gap-0.5 mr-1">
        <ToolbarIconButton
          title="Bullet list"
          icon="format_list_bulleted"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarIconButton
          title="Numbered list"
          icon="format_list_numbered"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <ToolbarIconButton
          title="Link"
          icon="link"
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        />
      </div>
      {variant === 'composer' && (
        <button
          type="button"
          onClick={() => {
            if (!htmlMode) {
              setHtmlSource(editor.getHTML());
              setHtmlMode(true);
            } else {
              editor.commands.setContent(htmlSource || '<p></p>');
              onChange(htmlSource || '<p></p>');
              setHtmlMode(false);
            }
          }}
          className="ml-auto text-xs text-primary font-bold px-2 py-1 rounded bg-primary-surface"
        >
          {htmlMode ? 'VISUAL MODE' : 'HTML MODE'}
        </button>
      )}
      {variant === 'default' && !hideMergeTags && (
        <>
          <span className="w-px h-5 bg-gray-200 mx-1" />
          {MERGE_TAGS.map((m) => (
            <button
              key={m.tag}
              type="button"
              onClick={() => insertTag(m.tag)}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-primary-surface text-primary border border-primary-border hover:bg-primary-border/40"
            >
              {m.tag}
            </button>
          ))}
        </>
      )}
    </div>
  );

  if (variant === 'composer') {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {toolbar}
        <div className="flex-1 overflow-y-auto composer-scrollbar">
          {htmlMode ? (
            <textarea
              value={htmlSource}
              onChange={(e) => {
                setHtmlSource(e.target.value);
                onChange(e.target.value);
              }}
              className="w-full min-h-[400px] p-12 font-mono text-sm text-gray-800 focus:outline-none resize-none"
              spellCheck={false}
            />
          ) : (
            <div className="p-12 max-w-4xl mx-auto w-full min-h-full" style={{ minHeight }}>
              <EditorContent editor={editor} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {toolbar}
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
