'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailTemplate } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TemplatesPage() {
  const { token, accountId } = useAuthStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('<p>Hi {{first_name}},</p>\n<p>Your message here.</p>');

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.templates.list(accountId, token).then((r) => setTemplates(r.templates));
  };

  useEffect(load, [token, accountId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId) return;
    await api.marketing.templates.create(accountId, { name, subject, htmlBody }, token);
    setName('');
    setSubject('');
    load();
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader title="Email templates" description="Reusable HTML with merge tags" />
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">New template</h2>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" required />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject {{first_name}}" required />
          <textarea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={8}
            className="w-full text-sm border border-gray-200 rounded-lg p-2 font-mono"
          />
          <p className="text-xs text-gray-400">Tags: {'{{first_name}}'}, {'{{name}}'}, {'{{email}}'}, custom attributes</p>
          <Button type="submit">Save template</Button>
        </form>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Library</h2>
          <ul className="space-y-2 text-sm">
            {templates.map((t) => (
              <li key={t.id} className="border-b border-gray-100 pb-2">
                <p className="font-medium">{t.name}</p>
                <p className="text-gray-500">{t.subject}</p>
              </li>
            ))}
            {templates.length === 0 && <p className="text-gray-400">No templates yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
