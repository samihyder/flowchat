'use client';

import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { EmailComposer } from '@/components/marketing/email-composer';

export default function EditTemplatePage() {
  const params = useParams();
  const templateId = params.id as string;
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<{
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
  } | null>(null);

  const load = useCallback(() => {
    if (!token || !accountId) return;
    api.marketing.templates
      .get(accountId, templateId, token)
      .then((r) => {
        setInitial({
          name: r.template.name,
          subject: r.template.subject,
          htmlBody: r.template.htmlBody ?? '<p></p>',
          textBody: r.template.textBody ?? '',
        });
      })
      .catch(() => router.push('/marketing/templates' as Route))
      .finally(() => setLoading(false));
  }, [accountId, router, templateId, token]);

  useEffect(load, [load]);

  const handleSave = async (data: {
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
  }) => {
    if (!token || !accountId) return;
    setSaving(true);
    try {
      await api.marketing.templates.update(
        accountId,
        templateId,
        {
          name: data.name,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
        },
        token
      );
      router.push('/marketing/templates' as Route);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !initial) {
    return (
      <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
        Loading template…
      </div>
    );
  }

  return (
    <EmailComposer
      title="Edit template"
      initialName={initial.name}
      initialSubject={initial.subject}
      initialHtmlBody={initial.htmlBody}
      initialTextBody={initial.textBody}
      showSaveAsTemplate={false}
      saving={saving}
      onSave={handleSave}
      onClose={() => router.push('/marketing/templates' as Route)}
    />
  );
}
