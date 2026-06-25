'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { EmailComposer } from '@/components/marketing/email-composer';

export default function NewTemplatePage() {
  const router = useRouter();
  const { token, accountId } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: {
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
  }) => {
    if (!token || !accountId) return;
    setSaving(true);
    try {
      await api.marketing.templates.create(
        accountId,
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

  return (
    <>
      <EmailComposer
        title="New template"
        showSaveAsTemplate={false}
        saving={saving}
        onSave={handleSave}
        onClose={() => router.push('/marketing/templates' as Route)}
      />
    </>
  );
}
