'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type Contact, type EmailTemplate, type MarketingSender } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmailRichEditor } from '@/components/marketing/email-rich-editor';
import { AutomationSchedulePreview } from '@/components/marketing/automation-schedule-preview';

type EmailDraft = {
  id: string;
  daysAfterPrevious: number;
  subject: string;
  htmlBody: string;
  templateId: string;
  saveAsTemplate: boolean;
};

function newEmailDraft(days = 0): EmailDraft {
  return {
    id: crypto.randomUUID(),
    daysAfterPrevious: days,
    subject: '',
    htmlBody: '<p>Hi {{first_name}},</p><p></p>',
    templateId: '',
    saveAsTemplate: true,
  };
}

const STEPS = ['Select contacts', 'Build email sequence', 'Launch'];

export default function NewAutomationPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [senderId, setSenderId] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [emails, setEmails] = useState<EmailDraft[]>([newEmailDraft(0)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en');

  const loadContacts = useCallback(async () => {
    if (!token || !accountId) return;
    const res = await api.contacts.list(accountId, token, {
      q: contactSearch || undefined,
      marketingStatus: 'subscribed',
      limit: 100,
    });
    setContacts(res.contacts.filter((c) => c.email));
  }, [token, accountId, contactSearch]);

  useEffect(() => {
    loadContacts().catch(() => {});
  }, [loadContacts]);

  useEffect(() => {
    if (!token || !accountId) return;
    Promise.all([
      api.marketing.templates.list(accountId, token),
      api.marketing.senders.list(accountId, token),
      api.account.get(accountId, token),
    ]).then(([t, s, accountRes]) => {
      setTemplates(t.templates);
      setSenders(s.senders);
      const def = s.senders.find((x) => x.isDefault);
      if (def) setSenderId(def.id);
      setTimezone(accountRes.account.timezone || 'UTC');
      setLocale(accountRes.account.locale || 'en');
    });
  }, [token, accountId]);

  const toggleContact = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateEmail = (id: string, patch: Partial<EmailDraft>) => {
    setEmails((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const applyTemplate = (emailId: string, templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    updateEmail(emailId, {
      templateId,
      subject: tpl.subject,
      htmlBody: tpl.htmlBody ?? '<p></p>',
    });
  };

  const addFollowUpEmail = () => {
    setEmails((list) => [...list, newEmailDraft(2)]);
  };

  const removeEmail = (id: string) => {
    if (emails.length <= 1) return;
    setEmails((list) => list.filter((e) => e.id !== id));
  };

  const launch = async () => {
    if (!token || !accountId) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.marketing.automations.create(
        accountId,
        {
          name: name.trim(),
          senderId: senderId || undefined,
          contactIds: [...selected],
          emails: emails.map((e) => ({
            daysAfterPrevious: e.daysAfterPrevious,
            subject: e.subject,
            htmlBody: e.templateId ? '' : e.htmlBody,
            templateId: e.templateId || undefined,
            saveAsTemplate: e.saveAsTemplate && !e.templateId,
            templateName: e.saveAsTemplate ? `${name.trim()} — ${e.subject.slice(0, 40)}` : undefined,
          })),
        },
        token
      );
      router.push(`/dashboard/marketing/${res.workflowId}` as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <Link href={'/dashboard/marketing' as Route} className="text-sm text-primary-600 hover:underline">
          ← Email automations
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 mt-2">New email automation</h1>
        <div className="flex gap-2 mt-4">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${
                i === step
                  ? 'bg-primary-100 text-primary-800 font-medium'
                  : i < step
                    ? 'text-primary-600 hover:bg-primary-50'
                    : 'text-gray-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white border text-xs flex items-center justify-center">
                {i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full">
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose one or more contacts with an email address. Only subscribed contacts receive emails.
            </p>
            <Input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search contacts…"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelected(new Set(contacts.map((c) => c.id)))}
              >
                Select all shown
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <span className="text-sm text-gray-500 self-center ml-auto">{selected.size} selected</span>
            </div>
            <ul className="bg-white border border-gray-200 rounded-xl divide-y max-h-96 overflow-y-auto">
              {contacts.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="rounded border-gray-300"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email}</p>
                    </div>
                  </label>
                </li>
              ))}
              {contacts.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-gray-400">
                  No contacts with email found. Sync leads from LeadSnapper first.
                </li>
              )}
            </ul>
            <div className="flex justify-end">
              <Button type="button" disabled={selected.size === 0} onClick={() => setStep(1)}>
                Next: Build emails →
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Add one or more emails. Set <strong>days after previous</strong> for follow-ups (e.g. 2 = send 2 days
              after the last email).
            </p>
            {emails.map((email, index) => (
              <div key={email.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Email {index + 1}
                    {index === 0 ? ' — sends immediately' : ''}
                  </h3>
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(email.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {index > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Send after previous email (days)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={email.daysAfterPrevious}
                      onChange={(e) =>
                        updateEmail(email.id, { daysAfterPrevious: Number(e.target.value) || 0 })
                      }
                      className="w-32"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Use saved template</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
                    value={email.templateId}
                    onChange={(e) => {
                      if (e.target.value) applyTemplate(email.id, e.target.value);
                      else updateEmail(email.id, { templateId: '' });
                    }}
                  >
                    <option value="">Write new email below</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Subject line</label>
                  <Input
                    value={email.subject}
                    onChange={(e) => updateEmail(email.id, { subject: e.target.value })}
                    placeholder="Hi {{first_name}}, quick question…"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Email body</label>
                  <EmailRichEditor
                    value={email.htmlBody}
                    onChange={(html) => updateEmail(email.id, { htmlBody: html, templateId: '' })}
                  />
                </div>
                {!email.templateId && (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={email.saveAsTemplate}
                      onChange={(e) => updateEmail(email.id, { saveAsTemplate: e.target.checked })}
                    />
                    Save as reusable template
                  </label>
                )}
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addFollowUpEmail}>
              + Add follow-up email
            </Button>
            <AutomationSchedulePreview
              emails={emails.map((e) => ({ daysAfterPrevious: e.daysAfterPrevious, subject: e.subject }))}
              timezone={timezone}
              locale={locale}
            />
            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                ← Back
              </Button>
              <Button
                type="button"
                disabled={emails.some((e) => !e.subject.trim())}
                onClick={() => setStep(2)}
              >
                Next: Launch →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Automation name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hot leads — March outreach"
                  required
                />
              </div>
              {senders.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Send from</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fromName} &lt;{s.fromEmail}&gt;
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {senders.length === 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Add a sender in Settings → Email marketing and connect Resend in Connected services.
                </p>
              )}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <p>
                <strong>{selected.size}</strong> contacts · <strong>{emails.length}</strong> email
                {emails.length === 1 ? '' : 's'}
              </p>
              <AutomationSchedulePreview
                emails={emails.map((e) => ({ daysAfterPrevious: e.daysAfterPrevious, subject: e.subject }))}
                timezone={timezone}
                locale={locale}
                compact
              />
              {emails.map((e, i) => (
                <p key={e.id} className="text-gray-600">
                  {i + 1}. {e.subject}
                  {i > 0 ? ` (after ${e.daysAfterPrevious} day${e.daysAfterPrevious === 1 ? '' : 's'})` : ' (now)'}
                </p>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button type="button" disabled={busy || !name.trim()} onClick={() => void launch()}>
                {busy ? 'Launching…' : 'Launch automation'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
