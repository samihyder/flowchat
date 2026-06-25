'use client';

import { useCallback, useRef, useState } from 'react';
import { EmailRichEditor, htmlToPlainPreview } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
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
    <div className="fixed inset-0 z-50 flex flex-col bg-white shadow-xl animate-marketing-slide-up">
      {/* Composer top bar — Stitch campaign_wizard_full_screen_composer */}
      <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-3xl">
          {showTemplateName ? (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                className="w-full border-none focus:ring-0 text-headline-sm font-semibold placeholder-gray-300 p-0 bg-transparent"
              />
            </div>
          ) : (
            <>
              <span className="text-gray-400 font-medium whitespace-nowrap text-sm hidden sm:inline">
                Subject:
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter campaign subject line…"
                className="w-full border-none focus:ring-0 text-headline-sm font-semibold placeholder-gray-300 min-w-0"
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="hidden sm:inline-flex text-on-surface-variant hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="text-on-surface-variant hover:bg-gray-50 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="bg-gray-900 text-white px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-black transition-all disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & Close'}
          </button>
        </div>
      </header>

      {error && (
        <div className="shrink-0 bg-status-danger-bg border-b border-status-danger-text/20 px-4 py-2 text-sm text-status-danger-text flex items-center gap-2">
          <MarketingIcon name="error" className="text-[18px]" />
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {showTemplateName && (
          <div className="shrink-0 border-b lg:border-b-0 border-gray-100 px-4 sm:px-6 py-3 lg:hidden">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject — Hi {{first_name}}"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-border"
            />
          </div>
        )}

        {showPreview ? (
          <div className="flex-1 overflow-auto composer-scrollbar p-6 sm:p-12 max-w-4xl mx-auto w-full">
            <p className="text-label-caps text-gray-500 mb-1">Subject preview</p>
            <p className="text-headline-sm font-semibold text-gray-900 mb-8">{previewSubject || '—'}</p>
            <p className="text-label-caps text-gray-500 mb-3">Body preview</p>
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        ) : (
          <EmailRichEditor
            value={htmlBody}
            onChange={handleHtmlChange}
            variant="composer"
            hideMergeTags
            onInsertTag={(fn) => {
              insertRef.current = fn;
            }}
          />
        )}

        {/* Merge tags rail */}
        <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-primary-surface/30 p-5 sm:p-6 overflow-y-auto composer-scrollbar">
          <h3 className="text-body-lg font-semibold text-on-surface mb-1">Available tags</h3>
          <p className="text-xs text-on-surface-variant mb-4">
            Click a chip to insert at the cursor.
          </p>
          <div className="flex flex-wrap gap-2">
            {MERGE_TAG_CHIPS.map((chip) => (
              <button
                key={chip.tag}
                type="button"
                title={chip.label}
                onClick={() => insertTag(chip.tag)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-surface border border-primary-border text-primary rounded-full font-data-mono text-data-mono hover:bg-primary-fixed transition-all group"
              >
                <MarketingIcon name="add_circle" className="text-sm group-hover:scale-110 transition-transform" />
                {chip.tag}
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-primary-border/50">
            <p className="text-label-caps text-on-surface-variant mb-2">Live preview</p>
            <p className="text-xs text-gray-600 line-clamp-5 leading-relaxed">
              {htmlToPlainPreview(previewWithSampleMergeTags(htmlBody), 200)}
            </p>
          </div>

          {showSaveAsTemplate && (
            <div className="mt-6 pt-4 border-t border-primary-border/50 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-gray-300 text-primary"
                />
                Save as template
              </label>
              {saveAsTemplate && (
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
                />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowPlainText((v) => !v)}
            className="mt-4 text-xs text-primary font-semibold hover:underline"
          >
            {showPlainText ? 'Hide' : 'Show'} plain-text version
          </button>
          {showPlainText && (
            <textarea
              value={textBody}
              onChange={(e) => {
                setTextTouched(true);
                setTextBody(e.target.value);
              }}
              rows={4}
              className="mt-2 w-full border border-gray-200 rounded-lg text-xs px-3 py-2 font-mono"
              placeholder="Plain-text fallback"
            />
          )}
        </aside>
      </div>

      {!showTemplateName && (
        <div className="hidden lg:block shrink-0 border-t border-gray-100 px-6 py-2 bg-gray-50/50">
          <p className="text-[10px] text-gray-400 font-data-mono">{title}</p>
        </div>
      )}
    </div>
  );
}
