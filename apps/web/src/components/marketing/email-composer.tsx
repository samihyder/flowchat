'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ComposerMergeChip } from '@/components/marketing/composer-merge-chip';
import { ComposerSmartSuggest } from '@/components/marketing/composer-smart-suggest';
import { EmailRichEditor, type InsertMergeTagFn } from '@/components/marketing/email-rich-editor';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import {
  MERGE_TAG_GROUPS,
  htmlToPlainText,
  mergeChipByKey,
  previewWithSampleMergeTags,
} from '@/lib/marketing/merge-tags';

export type EmailComposerSaveData = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  saveAsTemplate: boolean;
  templateName: string;
  category: string;
};

type FocusField = 'subject' | 'body';

const CATEGORY_OPTIONS = [
  { id: '', label: 'No category' },
  { id: 'welcome', label: 'Welcome' },
  { id: 'promotional', label: 'Promotional' },
  { id: 'nurture', label: 'Nurture' },
  { id: 'transactional', label: 'Transactional' },
];

type Props = {
  title: string;
  initialName?: string;
  initialSubject?: string;
  initialHtmlBody?: string;
  initialTextBody?: string;
  initialCategory?: string;
  showTemplateName?: boolean;
  showSaveAsTemplate?: boolean;
  showCategory?: boolean;
  saving?: boolean;
  onSave: (data: EmailComposerSaveData) => Promise<void> | void;
  onClose: () => void;
  onSendTest?: (to: string) => Promise<{ sentTo: string }>;
};

function insertIntoInput(
  input: HTMLInputElement,
  token: string,
  setValue: (value: string) => void
) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const next = input.value.slice(0, start) + token + input.value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    input.focus();
    const pos = start + token.length;
    input.setSelectionRange(pos, pos);
  });
}

function formatAutosaveAgo(at: Date): string {
  const sec = Math.floor((Date.now() - at.getTime()) / 1000);
  if (sec < 15) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min === 1) return '1 min ago';
  return `${min} mins ago`;
}

export function EmailComposer({
  title,
  initialName = '',
  initialSubject = '',
  initialHtmlBody = '<p>Hi {{first_name}},</p><p></p>',
  initialTextBody = '',
  initialCategory = '',
  showTemplateName = true,
  showSaveAsTemplate = false,
  showCategory = false,
  saving = false,
  onSave,
  onClose,
  onSendTest,
}: Props) {
  const insertRef = useRef<InsertMergeTagFn>(() => {});
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSubjectInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
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
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<FocusField>('body');
  const [lastAutosaveAt, setLastAutosaveAt] = useState<Date | null>(null);
  const [autosaveLabel, setAutosaveLabel] = useState<string | null>(null);
  const [showTestInput, setShowTestInput] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  const charCount = htmlToPlainText(htmlBody).length + subject.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLastAutosaveAt(new Date());
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [htmlBody, subject, name, textBody]);

  useEffect(() => {
    if (!lastAutosaveAt) return;
    const tick = () => setAutosaveLabel(formatAutosaveAgo(lastAutosaveAt));
    tick();
    const iv = window.setInterval(tick, 15000);
    return () => window.clearInterval(iv);
  }, [lastAutosaveAt]);

  const handleHtmlChange = (html: string) => {
    setHtmlBody(html);
    if (!textTouched) {
      setTextBody(htmlToPlainText(html));
    }
  };

  const activeSubjectInput = () =>
    focusField === 'subject'
      ? subjectInputRef.current ?? mobileSubjectInputRef.current
      : null;

  const insertTag = useCallback(
    (tag: string, drop?: { clientX: number; clientY: number }) => {
      if (focusField === 'subject') {
        const input = activeSubjectInput();
        if (input) {
          insertIntoInput(input, tag, setSubject);
          return;
        }
      }
      insertRef.current(tag, drop);
    },
    [focusField]
  );

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
    try {
      await onSave({
        name: name.trim(),
        subject: subject.trim(),
        htmlBody,
        textBody: textBody.trim() || htmlToPlainText(htmlBody),
        saveAsTemplate,
        templateName: templateName.trim(),
        category,
      });
      setSaveToast(
        showTemplateName ? 'Template saved successfully' : 'Campaign saved successfully'
      );
      await new Promise((r) => window.setTimeout(r, 2000));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleClose = () => {
    if (subject.trim() || htmlBody.replace(/<[^>]+>/g, '').trim()) {
      const ok = window.confirm('Discard unsaved changes?');
      if (!ok) return;
    }
    onClose();
  };

  const applySmartSuggest = (html: string) => {
    const hasBody = htmlBody.replace(/<[^>]+>/g, '').trim().length > 0;
    if (hasBody && !window.confirm('Replace current body with the suggested draft?')) return;
    handleHtmlChange(html);
    setFocusField('body');
  };

  const previewSubject = previewWithSampleMergeTags(subject);
  const previewHtml = previewWithSampleMergeTags(htmlBody);

  const sendTest = async () => {
    if (!onSendTest) return;
    setTestBusy(true);
    setTestMsg('');
    try {
      const res = await onSendTest(testEmail.trim());
      setTestMsg(`Test sent to ${res.sentTo}`);
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : 'Test send failed.');
    } finally {
      setTestBusy(false);
    }
  };

  const openHtmlPreview = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(previewHtml);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white shadow-xl animate-marketing-slide-up">
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
                ref={subjectInputRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setFocusField('subject')}
                placeholder="Enter campaign subject line…"
                className="w-full border-none focus:ring-0 text-headline-sm font-semibold placeholder-gray-300 min-w-0"
              />
            </>
          )}
        </div>
        {showCategory && showTemplateName && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="hidden sm:block shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
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
              ref={mobileSubjectInputRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setFocusField('subject')}
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
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {showTemplateName && (
              <div className="hidden lg:block shrink-0 border-b border-gray-100 px-6 py-3 bg-white">
                <label className="text-xs font-medium text-gray-500 block mb-1">Subject line</label>
                <input
                  ref={subjectInputRef}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setFocusField('subject')}
                  placeholder="Subject — Hi {{first_name}}"
                  className="w-full max-w-3xl border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-border"
                />
              </div>
            )}
            <EmailRichEditor
              value={htmlBody}
              onChange={handleHtmlChange}
              variant="composer"
              hideMergeTags
              mobilePreview={mobilePreview}
              onFocusEditor={() => setFocusField('body')}
              onInsertTag={(fn) => {
                insertRef.current = fn;
              }}
            />
          </div>
        )}

        <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-5 sm:p-6 border-b border-gray-200 bg-white shrink-0">
            <h3 className="text-headline-sm font-semibold text-gray-900 mb-1">Personalization</h3>
            <p className="text-xs text-gray-500">
              Drag or click tags to insert into the{' '}
              {focusField === 'subject' ? 'subject line' : 'email body'}.
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
                      <ComposerMergeChip
                        key={key}
                        label={key}
                        tagKey={key}
                        title={chip.label}
                        onInsert={insertTag}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <ComposerSmartSuggest onApply={applySmartSuggest} />

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

      <footer className="h-16 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 bg-white shrink-0">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {onSendTest && (
            <div className="flex items-center gap-2">
              {showTestInput ? (
                <>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-40 focus:ring-2 focus:ring-primary-border"
                  />
                  <button
                    type="button"
                    disabled={testBusy}
                    onClick={() => void sendTest()}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    {testBusy ? 'Sending…' : 'Send'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTestInput(true)}
                  className="text-sm font-medium text-gray-700 hover:text-primary flex items-center gap-1.5"
                >
                  <MarketingIcon name="send" className="text-[16px]" />
                  Send test email
                </button>
              )}
              {testMsg && (
                <span
                  className={`text-xs ${
                    testMsg.startsWith('Test sent') ? 'text-status-success-text' : 'text-status-danger-text'
                  }`}
                >
                  {testMsg}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={openHtmlPreview}
            className="text-sm font-medium text-gray-700 hover:text-primary flex items-center gap-1.5"
          >
            <MarketingIcon name="code" className="text-[16px]" />
            Preview HTML
          </button>
          <div className="hidden sm:block h-4 w-px bg-gray-200" />
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
          {autosaveLabel && (
            <>
              <div className="flex items-center gap-1.5 animate-marketing-pulse-subtle">
                <MarketingIcon name="cloud_done" className="text-[14px]" />
                <span>Auto-saved {autosaveLabel}</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-gray-200" />
            </>
          )}
          <span>Characters: {charCount.toLocaleString()}</span>
        </div>
      </footer>

      {saveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[100] animate-marketing-slide-up">
          <MarketingIcon name="check_circle" className="text-status-success-text" />
          <span className="text-sm font-medium">{saveToast}</span>
        </div>
      )}
    </div>
  );
}
