'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate, type MarketingSender } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmailRichEditor, htmlToPlainPreview } from '@/components/marketing/email-rich-editor';

export default function TemplatesPage() {
  const { token, accountId } = useAuthStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('<p>Hi {{first_name}},</p><p></p>');
  const [testEmail, setTestEmail] = useState('');
  const [testSenderId, setTestSenderId] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.templates.list(accountId, token).then((r) => setTemplates(r.templates));
    api.marketing.senders.list(accountId, token).then((r) => setSenders(r.senders));
  };

  useEffect(load, [token, accountId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    await api.marketing.templates.create(accountId, { name, subject, htmlBody }, token);
    setName('');
    setSubject('');
    setHtmlBody('<p>Hi {{first_name}},</p><p></p>');
    setShowCreate(false);
    load();
  };

  const testSend = async (templateId: string) => {
    if (!token || !accountId) return;
    setTestingId(templateId);
    setTestMsg('');
    try {
      const res = await api.marketing.templates.testSend(
        accountId,
        templateId,
        { to: testEmail.trim() || undefined, senderId: testSenderId || undefined },
        token
      );
      setTestMsg(`Test sent to ${res.sentTo}`);
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : 'Test send failed');
    } finally {
      setTestingId(null);
    }
  };

  const stats = useMemo(() => ({ templates: templates.length }), [templates.length]);

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Email templates"
        description="Reusable emails — pick these when building an automation"
        action={
          <Button type="button" onClick={() => setShowCreate((o) => !o)}>
            + New template
          </Button>
        }
      />

      <div className="px-6 pb-6 space-y-6">
        {showCreate && (
          <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-2xl">
            <h2 className="font-semibold text-gray-900">New template</h2>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" required />
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject — Hi {{first_name}}"
              required
            />
            <EmailRichEditor value={htmlBody} onChange={setHtmlBody} placeholder="Write your email…" />
            <div className="flex gap-2">
              <Button type="submit">Save template</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <p className="text-sm text-gray-500">{stats.templates} saved template{stats.templates === 1 ? '' : 's'}</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
              <p className="font-semibold text-gray-900">{t.name}</p>
              <p className="text-sm text-gray-600 mt-1 truncate">{t.subject}</p>
              <p className="text-xs text-gray-400 mt-2 flex-1 line-clamp-2">
                {htmlToPlainPreview(t.htmlBody ?? '')}
              </p>
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Test inbox email"
                  type="email"
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={testingId === t.id}
                  onClick={() => void testSend(t.id)}
                >
                  {testingId === t.id ? 'Sending…' : 'Send test'}
                </Button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-gray-400 col-span-full py-8 text-center">
              No templates yet. Create one above or save from an automation.
            </p>
          )}
        </div>

        {testMsg && <p className="text-sm text-green-600">{testMsg}</p>}

        {senders.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 max-w-2xl">
            Connect Resend and add a sender in Settings → Email marketing before test sends.
          </p>
        )}
      </div>
    </div>
  );
}
