'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { WorkflowForm, type WorkflowFormData } from '@/components/marketing/workflow-form';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';
import { marketingRoutes } from '@/lib/marketing/routes';
import { marketingErrorMessage } from '@/lib/marketing/error-messages';

type InitialData = Partial<WorkflowFormData> & {
  contacts?: { id: string; name: string; email: string | null }[];
};

export default function EditAutomationPage() {
  const params = useParams();
  const router = useRouter();
  const automationId = params.id as string;
  const { token, accountId } = useAuthStore();
  const [initial, setInitial] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !accountId) return;
    api.marketing.automations
      .getEdit(accountId, automationId, token)
      .then(async (r) => {
        const contacts = r.edit.contactIds.length
          ? (await api.contacts.list(accountId, token, { ids: r.edit.contactIds, limit: r.edit.contactIds.length })).contacts
          : [];
        setInitial({
          name: r.edit.name,
          senderId: r.edit.senderId,
          contactIds: r.edit.contactIds,
          emails: r.edit.emails.map((e) => ({
            sendAt: e.sendAt,
            subject: e.subject,
            htmlBody: e.htmlBody,
          })),
          contacts: contacts.map((c) => ({ id: c.id, name: c.name, email: c.email })),
        });
      })
      .catch((err) => setError(marketingErrorMessage(err, 'Could not load automation.')))
      .finally(() => setLoading(false));
  }, [token, accountId, automationId]);

  const handleSubmit = async (data: WorkflowFormData) => {
    if (!token || !accountId) return;
    setBusy(true);
    setError('');
    try {
      await api.marketing.automations.update(
        accountId,
        automationId,
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
      router.push(marketingRoutes.automation(automationId) as Route);
    } catch (err) {
      setError(marketingErrorMessage(err, 'Could not save changes.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader title="Edit automation" />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : token && accountId && initial ? (
          <WorkflowForm
            accountId={accountId}
            token={token}
            initial={initial}
            submitLabel="Save changes"
            busy={busy}
            error={error}
            onSubmit={(data) => void handleSubmit(data)}
            onCancel={() => router.push(marketingRoutes.automation(automationId) as Route)}
          />
        ) : (
          <p className="text-sm text-red-600">{error || 'Automation not found.'}</p>
        )}
      </div>
    </div>
  );
}
