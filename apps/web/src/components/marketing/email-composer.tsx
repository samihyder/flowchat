'use client';

import { useCallback, useRef, useState } from 'react';
import { EmailRichEditor, htmlToPlainPreview } from '@/components/marketing/email-rich-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MERGE_TAG_CHIPS,
  htmlToPlainText,
  previewWithSampleMergeTags,
} from '@/lib/marketing/merge-tags';

export type EmailComposerSaveData = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  saveAsTemplate: boolean;
  templateName: string;
};

type Props = {
  title: string;
  initialName?: string;
  initialSubject?: string;
  initialHtmlBody?: string;
  initialTextBody?: string;
  showTemplateName?: boolean;
  showSaveAsTemplate?: boolean;
  saving?: boolean;
  onSave: (data: EmailComposerSaveData) => Promise<void> | void;
  onClose: () => void;
};

export function EmailComposer({
  title,
  initialName = '',
  initialSubject = '',
  initialHtmlBody = '<p>Hi {{first_name}},</p><p></p>',
  initialTextBody = '',
  showTemplateName = true,
  showSaveAsTemplate = false,
  saving = false,
  onSave,
  onClose,
}: Props) {
  const insertRef = useRef<(tag: string) => void>(() => {});
  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody);
  const [textBody, setTextBody] = useState(initialTextBody || htmlToPlainText(initialHtmlBody));
  const [textTouched, setTextTouched] = useState(Boolean(initialTextBody));
  const [showPlainText, setShowPlainText] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState('');

  const handleHtmlChange = (html: string) => {
    setHtmlBody(html);
    if (!textTouched) {
      setTextBody(htmlToPlainText(html));
    }
  };

  const insertTag = useCallback((tag: string) => {
    insertRef.current(tag);
  }, []);

  const handleSave = async () => {
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (showTemplateName && !name.trim()) {
      setError('Template name is required.');
      return;
    }
    if (saveAsTemplate && !templateName.trim()) {
      setError('Enter a name for the saved template.');
      return;
    }
    setError('');
    await onSave({
      name: name.trim(),
      subject: subject.trim(),
      htmlBody,
      textBody: textBody.trim() || htmlToPlainText(htmlBody),
      saveAsTemplate,
      templateName: templateName.trim(),
    });
  };

  const handleClose = () => {
    if (subject.trim() || htmlBody.replace(/<[^>]+>/g, '').trim()) {
      const ok = window.confirm('Discard unsaved changes?');
      if (!ok) return;
    }
    onClose();
  };

  const previewSubject = previewWithSampleMergeTags(subject);
  const previewHtml = previewWithSampleMergeTags(htmlBody);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          {showTemplateName && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="mt-1 max-w-md font-semibold border-0 shadow-none px-0 h-8 focus-visible:ring-0"
            />
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </header>

      {error && (
        <div className="shrink-0 bg-red-50 border-b border-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3 overflow-hidden">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject — Hi {{first_name}}"
            className="bg-white"
          />

          {showPreview ? (
            <div className="flex-1 min-h-0 overflow-auto bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm font-medium text-gray-500 mb-1">Subject preview</p>
              <p className="text-lg font-semibold text-gray-900 mb-6">{previewSubject || '—'}</p>
              <p className="text-sm font-medium text-gray-500 mb-2">Body preview</p>
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <EmailRichEditor
                value={htmlBody}
                onChange={handleHtmlChange}
                minHeight="min(60vh, 480px)"
                hideMergeTags
                onInsertTag={(fn) => {
                  insertRef.current = fn;
                }}
              />
            </div>
          )}
        </div>

        <aside className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Merge tags
          </p>
          <div className="flex flex-wrap gap-2">
            {MERGE_TAG_CHIPS.map((chip) => (
              <button
                key={chip.tag}
                type="button"
                title={chip.label}
                onClick={() => insertTag(chip.tag)}
                className="px-2 py-1 text-[11px] font-mono rounded-lg bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-100"
              >
                {chip.tag}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Click a chip to insert at the cursor. Sample values appear in preview mode.
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Sample snippet
            </p>
            <p className="text-xs text-gray-600 line-clamp-4">
              {htmlToPlainPreview(previewWithSampleMergeTags(htmlBody), 160)}
            </p>
          </div>
        </aside>
      </div>

      <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 space-y-3">
        {showSaveAsTemplate && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="rounded border-gray-300"
              />
              Save as template
            </label>
            {saveAsTemplate && (
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="max-w-xs h-9"
              />
            )}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowPlainText((v) => !v)}
            className="text-sm text-primary-600 hover:underline"
          >
            {showPlainText ? 'Hide' : 'Show'} plain-text version (advanced)
          </button>
          {showPlainText && (
            <textarea
              value={textBody}
              onChange={(e) => {
                setTextTouched(true);
                setTextBody(e.target.value);
              }}
              rows={5}
              className="mt-2 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 font-mono"
              placeholder="Plain-text fallback for email clients without HTML"
            />
          )}
        </div>
      </footer>
    </div>
  );
}
