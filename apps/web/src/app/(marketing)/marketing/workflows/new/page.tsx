'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';
import { WorkflowForm, type WorkflowFormData } from '@/components/marketing/workflow-form';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

export default function NewWorkflowPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: WorkflowFormData) => {
    if (!token || !accountId) return;
    if (!data.contactIds.length) {
      setError('Select at least one contact to enroll.');
      return;
    }
    if (data.emails.some((e) => !e.subject.trim() || !e.htmlBody.trim())) {
      setError('Every email needs a subject and body.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.marketing.automations.create(
        accountId,
        {
          name: data.name,
          senderId: data.senderId || undefined,
          contactIds: data.contactIds,
          emails: data.emails.map((e) => ({
            sendAt: new Date(e.sendAt).toISOString(),
            subject: e.subject,
            htmlBody: e.htmlBody,
          })),
        },
        token
      );
      router.push(marketingRoutes.workflow(res.workflowId) as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader title="New workflow" />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {token && accountId && (
          <WorkflowForm
            accountId={accountId}
            token={token}
            submitLabel="Create workflow"
            busy={busy}
            error={error}
            onSubmit={handleSubmit}
            onCancel={() => router.push(marketingRoutes.workflows as Route)}
          />
        )}
      </div>
    </div>
  );
}
