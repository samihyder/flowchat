'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSender, type MarketingWorkflow, type EmailTemplate } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WorkflowsPage() {
  const { token, accountId } = useAuthStore();
  const [workflows, setWorkflows] = useState<MarketingWorkflow[]>([]);
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [name, setName] = useState('');
  const [senderId, setSenderId] = useState('');
  const [waitHours, setWaitHours] = useState('24');
  const [templateId, setTemplateId] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.workflows.list(accountId, token).then((r) => setWorkflows(r.workflows));
    api.marketing.senders.list(accountId, token).then((r) => setSenders(r.senders));
    api.marketing.templates.list(accountId, token).then((r) => setTemplates(r.templates));
  };

  useEffect(load, [token, accountId]);

  const createDrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || !templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    await api.marketing.workflows.create(
      accountId,
      {
        name: name.trim() || 'Welcome drip',
        triggerType: 'manual',
        senderId: senderId || undefined,
        allowReentry: false,
        steps: [
          { stepType: 'send_email', config: { templateId } },
          { stepType: 'wait', config: { hours: Number(waitHours) || 24 } },
          { stepType: 'send_email', config: { templateId, subjectPrefix: 'Follow-up: ' } },
          { stepType: 'exit', config: {} },
        ],
      },
      token
    );
    setName('');
    load();
  };

  const runProcessor = async () => {
    if (!token || !accountId) return;
    setProcessing(true);
    try {
      await api.marketing.workflows.process(accountId, token);
      load();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <PageHeader
        title="Automation workflows"
        description="Drip sequences with send → wait → send steps. Enroll contacts manually from their profile."
        action={
          <Button type="button" variant="secondary" onClick={() => void runProcessor()} disabled={processing}>
            {processing ? 'Processing…' : 'Run due steps'}
          </Button>
        }
      />
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={createDrip} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">New drip sequence</h2>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" />
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="">Default sender</option>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.fromEmail})
              </option>
            ))}
          </select>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            required
          >
            <option value="">First email template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            value={waitHours}
            onChange={(e) => setWaitHours(e.target.value)}
            placeholder="Wait hours between emails"
          />
          <Button type="submit">Create workflow</Button>
        </form>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Active workflows</h2>
          <ul className="space-y-3 text-sm">
            {workflows.map((w) => (
              <li key={w.id} className="border-b border-gray-100 pb-3">
                <p className="font-medium">{w.name}</p>
                <p className="text-gray-500 capitalize">
                  {w.triggerType.replace(/_/g, ' ')} · {w.steps.length} steps · {w.activeEnrollments} enrolled
                </p>
                <ul className="mt-1 text-xs text-gray-400">
                  {w.steps.map((s) => (
                    <li key={s.id}>
                      {s.stepOrder}. {s.stepType.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {workflows.length === 0 && <p className="text-gray-400">No workflows yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
