'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import {
  MERGE_TAG_GROUPS,
  htmlToPlainText,
  mergeChipByKey,
  mergeTagChipLabel,
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
  const [showMergePreview, setShowMergePreview] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState('');

  const charCount = useMemo(
    () => htmlToPlainText(htmlBody).length,
    [htmlBody]
  );

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
      {/* Top bar — Stitch campaign_wizard_full_screen_composer */}
      <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 max-w-3xl">
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
              <span className="text-gray-400 font-medium whitespace-nowrap text-sm">Subject:</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter campaign subject line…"
                className="w-full border-none focus:ring-0 text-headline-sm font-semibold placeholder-gray-300 min-w-0"
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowMergePreview((v) => !v)}
            className="hidden sm:inline-flex text-on-surface-variant hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showMergePreview ? 'Edit' : 'Preview'}
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

        {showMergePreview ? (
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
            mobilePreview={mobilePreview}
            onInsertTag={(fn) => {
              insertRef.current = fn;
            }}
          />
        )}

        {/* Right rail — Stitch S6M-15 Personalization */}
        <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-5 sm:p-6 border-b border-gray-200 bg-white shrink-0">
            <h3 className="text-headline-sm font-semibold text-gray-900 mb-1">Personalization</h3>
            <p className="text-xs text-gray-500">
              Click a tag to insert dynamic customer data at the cursor.
            </p>
          </div>
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto composer-scrollbar flex-1">
            {MERGE_TAG_GROUPS.map((group) => (
              <div key={group.label}>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {group.keys.map((key) => {
                    const chip = mergeChipByKey(key);
                    if (!chip) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        title={chip.label}
                        onClick={() => insertTag(chip.tag)}
                        className="merge-chip-transition bg-primary-surface text-primary border border-primary-border rounded-full px-2.5 py-1 text-xs font-medium hover:bg-primary-container cursor-pointer font-data-mono flex items-center gap-2 group"
                      >
                        <MarketingIcon
                          name="drag_indicator"
                          className="text-xs text-gray-400 group-hover:text-primary transition-colors"
                        />
                        {mergeTagChipLabel(chip.tag)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {showTemplateName && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPlainText((v) => !v)}
                  className="text-xs text-primary font-semibold hover:underline"
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
                    className="mt-2 w-full border border-gray-200 rounded-lg text-xs px-3 py-2 font-mono bg-white"
                    placeholder="Plain-text fallback"
                  />
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom bar — Stitch §4.9 / S6M-13 */}
      <footer className="h-16 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 bg-white shrink-0">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Mobile Preview</span>
            <button
              type="button"
              role="switch"
              aria-checked={mobilePreview}
              onClick={() => setMobilePreview((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                mobilePreview ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mobilePreview ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {showSaveAsTemplate && (
            <>
              <div className="hidden sm:block h-4 w-px bg-gray-200" />
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">
                  Save as Template
                </span>
              </label>
              {saveAsTemplate && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Template Name:</span>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Welcome Email"
                    className="text-xs border-gray-200 rounded px-2 py-1 focus:ring-primary focus:border-primary w-36 sm:w-40"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="hidden sm:flex items-center gap-1.5">
            <MarketingIcon name="edit_note" className="text-[14px]" />
            <span className="truncate max-w-[140px]">{title}</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-gray-200" />
          <span>Characters: {charCount.toLocaleString()}</span>
        </div>
      </footer>
    </div>
  );
}
