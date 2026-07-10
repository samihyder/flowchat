'use client';

import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { marketingRoutes } from '@/lib/marketing/routes';
import { WorkflowForm, type WorkflowFormData } from '@/components/marketing/workflow-form';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';

type ContactOption = { id: string; name: string; email: string | null };

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditWorkflowPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [initial, setInitial] = useState<{
    name: string;
    senderId: string;
    emails: { sendAt: string; subject: string; htmlBody: string }[];
    contacts: ContactOption[];
  } | null>(null);

  const load = useCallback(() => {
    if (!token || !accountId) return;
    api.marketing.automations
      .getEdit(accountId, workflowId, token)
      .then(async (r) => {
        const contactDetails = await Promise.all(
          r.edit.contactIds.map((id) =>
            api.contacts.get(accountId, id, token).then(
              (c) => ({ id, name: c.contact.name, email: c.contact.email }),
              () => ({ id, name: id, email: null })
            )
          )
        );
        setInitial({
          name: r.edit.name,
          senderId: r.edit.senderId,
          emails: r.edit.emails.map((e) => ({
            sendAt: toDatetimeLocal(e.sendAt),
            subject: e.subject,
            htmlBody: e.htmlBody,
          })),
          contacts: contactDetails,
        });
      })
      .catch(() => router.push(marketingRoutes.workflows as Route))
      .finally(() => setLoading(false));
  }, [accountId, router, token, workflowId]);

  useEffect(load, [load]);

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
      await api.marketing.automations.update(
        accountId,
        workflowId,
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
      router.push(marketingRoutes.workflow(workflowId) as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !initial) {
    return (
      <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
        Loading workflow…
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader title="Edit workflow" />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {token && accountId && (
          <WorkflowForm
            accountId={accountId}
            token={token}
            initial={{
              name: initial.name,
              senderId: initial.senderId,
              emails: initial.emails,
              contacts: initial.contacts,
            }}
            submitLabel="Save changes"
            busy={busy}
            error={error}
            onSubmit={handleSubmit}
            onCancel={() => router.push(marketingRoutes.workflow(workflowId) as Route)}
          />
        )}
      </div>
    </div>
  );
}
