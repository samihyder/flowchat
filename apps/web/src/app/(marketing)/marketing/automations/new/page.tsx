'use client';

import { useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { WorkflowForm, type WorkflowFormData } from '@/components/marketing/workflow-form';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';
import { marketingRoutes } from '@/lib/marketing/routes';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';

export default function NewAutomationPage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: WorkflowFormData) => {
    if (!token || !accountId) return;
    if (!data.contactIds.length) {
      setError('Add at least one contact to enroll.');
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
      router.push(marketingRoutes.automation(res.workflowId) as Route);
    } catch (err) {
      setError(marketingErrorMessage(err, 'Could not create automation.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader title="New automation" />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {token && accountId && (
          <WorkflowForm
            accountId={accountId}
            token={token}
            submitLabel="Create automation"
            busy={busy}
            error={error}
            onSubmit={(data) => void handleSubmit(data)}
            onCancel={() => router.push(marketingRoutes.automations as Route)}
          />
        )}
      </div>
    </div>
  );
}
