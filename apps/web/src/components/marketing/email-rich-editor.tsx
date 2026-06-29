'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect, useState } from 'react';
import { MergeTagNode } from '@/components/marketing/editor/merge-tag-extension';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import {
  editorHtmlToStorageHtml,
  parseMergeTagKey,
  storageHtmlToEditorHtml,
} from '@/lib/marketing/merge-tag-editor';

const MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'First name' },
  { tag: '{{name}}', label: 'Name' },
  { tag: '{{email}}', label: 'Email' },
];

export type InsertMergeTagFn = (
  tag: string,
  drop?: { clientX: number; clientY: number }
) => void;

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  hideMergeTags?: boolean;
  onInsertTag?: (insert: InsertMergeTagFn) => void;
  onFocusEditor?: () => void;
  variant?: 'default' | 'composer';
  mobilePreview?: boolean;
};

function ToolbarIconButton({
  onClick,
  active,
  disabled,
  title,
  icon,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
  onFocusEditor,
  variant = 'default',
  mobilePreview = false,
}: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      MergeTagNode,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write your email…' }),
    ],
    content: storageHtmlToEditorHtml(value || '<p></p>'),
    editorProps: {
      attributes: {
        class:
          variant === 'composer'
            ? 'prose prose-sm max-w-none focus:outline-none text-lg leading-relaxed text-gray-800 min-h-[400px]'
            : 'prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm text-gray-800 min-h-[120px]',
      },
      handleDOMEvents: {
        focus: () => {
          onFocusEditor?.();
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      const storage = editorHtmlToStorageHtml(ed.getHTML());
      onChange(storage);
      setHtmlSource(storage);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const editorHtml = editor.getHTML();
    const storageFromEditor = editorHtmlToStorageHtml(editorHtml);
    if (value !== storageFromEditor) {
      const nextEditorHtml = storageHtmlToEditorHtml(value || '<p></p>');
      editor.commands.setContent(nextEditorHtml, { emitUpdate: false });
      setHtmlSource(value || '<p></p>');
    }
  }, [value, editor]);

  const insertMergeContent = useCallback(
    (tag: string, drop?: { clientX: number; clientY: number }) => {
      if (!editor) return;
      const key = parseMergeTagKey(tag);
      if (!key) return;

      if (htmlMode) {
        const next = `${htmlSource}${tag}`;
        setHtmlSource(next);
        onChange(next);
        return;
      }

      if (drop) {
        const coords = editor.view.posAtCoords({ left: drop.clientX, top: drop.clientY });
        const pos = coords?.pos ?? editor.state.selection.anchor;
        editor
          .chain()
          .focus()
          .insertContentAt(pos, { type: 'mergeTag', attrs: { key } })
          .run();
        return;
      }

      editor.chain().focus().insertContent({ type: 'mergeTag', attrs: { key } }).run();
    },
    [editor, htmlMode, htmlSource, onChange]
  );

  useEffect(() => {
    if (editor && onInsertTag) {
      onInsertTag(insertMergeContent);
    }
  }, [editor, onInsertTag, insertMergeContent]);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-merge-tag')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const tag = e.dataTransfer.getData('application/x-merge-tag');
    if (!tag) return;
    e.preventDefault();
    insertMergeContent(tag, { clientX: e.clientX, clientY: e.clientY });
  };

  if (!editor) {
    return (
      <div
        className="border border-gray-200 rounded-lg bg-gray-50 animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  const toolbar = (
    <div
      className={`flex flex-wrap items-center gap-1 ${
        variant === 'composer'
          ? 'sticky top-0 bg-white border-b border-gray-100 px-6 py-3 z-10'
          : 'px-2 py-1.5 border-b border-gray-100 bg-gray-50'
      }`}
    >
      {variant === 'composer' && (
        <div className="flex items-center border-r border-gray-200 pr-3 gap-0.5 mr-1">
          <ToolbarIconButton
            title="Undo"
            icon="undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolbarIconButton
            title="Redo"
            icon="redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
      )}
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
        <ToolbarIconButton
          title="Underline"
          icon="format_underlined"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
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
        {variant === 'composer' && (
          <>
            <ToolbarIconButton
              title="Image URL"
              icon="image"
              onClick={() => {
                const url = window.prompt('Image URL');
                if (url) editor.chain().focus().insertContent(`<img src="${url}" alt="" />`).run();
              }}
            />
            <ToolbarIconButton
              title="HTML source"
              icon="code"
              active={htmlMode}
              onClick={() => {
                if (!htmlMode) {
                  setHtmlSource(editorHtmlToStorageHtml(editor.getHTML()));
                  setHtmlMode(true);
                } else {
                  editor.commands.setContent(storageHtmlToEditorHtml(htmlSource || '<p></p>'), {
                    emitUpdate: false,
                  });
                  onChange(htmlSource || '<p></p>');
                  setHtmlMode(false);
                }
              }}
            />
          </>
        )}
      </div>
      {variant === 'composer' && (
        <button
          type="button"
          onClick={() => {
            if (!htmlMode) {
              setHtmlSource(editorHtmlToStorageHtml(editor.getHTML()));
              setHtmlMode(true);
            } else {
              editor.commands.setContent(storageHtmlToEditorHtml(htmlSource || '<p></p>'), {
                emitUpdate: false,
              });
              onChange(htmlSource || '<p></p>');
              setHtmlMode(false);
            }
          }}
          className="ml-auto text-xs text-primary font-bold px-2 py-1 rounded bg-primary-surface hover:bg-primary-fixed transition-colors"
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
              onClick={() => insertMergeContent(m.tag)}
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
      <div
        className="flex-1 flex flex-col bg-white overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {toolbar}
        <div
          className={`flex-1 overflow-y-auto composer-scrollbar transition-all duration-300 ${
            mobilePreview ? 'bg-gray-50' : ''
          }`}
        >
          {htmlMode ? (
            <textarea
              value={htmlSource}
              onChange={(e) => {
                setHtmlSource(e.target.value);
                onChange(e.target.value);
              }}
              onFocus={() => onFocusEditor?.()}
              className={`w-full min-h-[400px] font-mono text-sm text-gray-800 focus:outline-none resize-none transition-all duration-300 ${
                mobilePreview
                  ? 'max-w-[375px] mx-auto p-6 shadow-2xl border border-gray-100 bg-white my-4'
                  : 'p-12'
              }`}
              spellCheck={false}
            />
          ) : (
            <div
              className={`mx-auto w-full min-h-full transition-all duration-300 ${
                mobilePreview
                  ? 'max-w-[375px] p-6 my-4 shadow-2xl border border-gray-100 rounded-xl bg-white'
                  : 'p-12 max-w-4xl'
              }`}
              style={{ minHeight }}
            >
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
