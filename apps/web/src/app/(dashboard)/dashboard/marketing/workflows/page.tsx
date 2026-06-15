'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type MarketingSender, type MarketingWorkflow, type EmailTemplate } from '@/lib/api';
import { WorkflowStepBuilder, type WorkflowStepDraft } from '@/components/marketing/workflow-step-builder';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WorkflowsPage() {
  const { token, accountId } = useAuthStore();
  const [workflows, setWorkflows] = useState<MarketingWorkflow[]>([]);
  const [senders, setSenders] = useState<MarketingSender[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [senderId, setSenderId] = useState('');
  const [steps, setSteps] = useState<WorkflowStepDraft[]>([
    { stepType: 'send_email', config: {} },
    { stepType: 'wait', config: { hours: 24 } },
    { stepType: 'exit', config: {} },
  ]);
  const [processing, setProcessing] = useState(false);

  const load = () => {
    if (!token || !accountId) return;
    api.marketing.workflows.list(accountId, token).then((r) => setWorkflows(r.workflows));
    api.marketing.senders.list(accountId, token).then((r) => setSenders(r.senders));
    api.marketing.templates.list(accountId, token).then((r) => setTemplates(r.templates));
  };

  useEffect(load, [token, accountId]);

  const createWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !accountId || steps.length === 0) return;
    await api.marketing.workflows.create(
      accountId,
      {
        name: name.trim() || 'Automation workflow',
        triggerType,
        senderId: senderId || undefined,
        allowReentry: false,
        steps,
      },
      token
    );
    setName('');
    setSteps([{ stepType: 'send_email', config: {} }, { stepType: 'exit', config: {} }]);
    load();
  };

  const toggleWorkflow = async (workflowId: string, enabled: boolean) => {
    if (!token || !accountId) return;
    await api.marketing.workflows.update(accountId, workflowId, { enabled }, token);
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
        description="Visual step builder with triggers, branches, and drip delays"
        action={
          <Button type="button" variant="secondary" onClick={() => void runProcessor()} disabled={processing}>
            {processing ? 'Processing…' : 'Run due steps'}
          </Button>
        }
      />
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={createWorkflow} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">New workflow</h2>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" />
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="manual">Manual enrollment</option>
            <option value="contact_created">Contact created</option>
            <option value="label_added">Label added</option>
            <option value="conversation_resolved">Conversation resolved</option>
          </select>
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="">Default sender</option>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <WorkflowStepBuilder
            steps={steps}
            onChange={setSteps}
            templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          />
          <div className="rounded-xl border border-gray-200 bg-slate-100 p-4 -mx-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Workflow canvas preview
            </p>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`w-full max-w-xs bg-white border rounded-lg px-3 py-2 text-xs font-medium shadow-sm border-l-4 ${
                      s.stepType === 'send_email'
                        ? 'border-l-green-500'
                        : s.stepType === 'wait'
                          ? 'border-l-amber-500'
                          : s.stepType === 'branch'
                            ? 'border-l-violet-500'
                            : 'border-l-gray-400'
                    }`}
                  >
                    {s.stepType.replace(/_/g, ' ')}
                  </div>
                  {i < steps.length - 1 && <div className="w-px h-4 bg-gray-300" />}
                </div>
              ))}
            </div>
          </div>
          <Button type="submit">Create workflow</Button>
        </form>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Workflows</h2>
          <ul className="space-y-3 text-sm">
            {workflows.map((w) => (
              <li key={w.id} className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-gray-500 capitalize">
                      {w.triggerType.replace(/_/g, ' ')} · {w.steps.length} steps · {w.activeEnrollments} active
                    </p>
                    <ul className="mt-1 text-xs text-gray-400">
                      {w.steps.map((s, i) => (
                        <li key={s.id}>{i + 1}. {s.stepType.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void toggleWorkflow(w.id, !w.enabled)}>
                    {w.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </li>
            ))}
            {workflows.length === 0 && <p className="text-gray-400">No workflows yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
