import type { AppSql } from '@/lib/db-sql';
import type { ContactRecord } from '@/lib/contact-sync';

const FLOWCHAT_SYNC_TAG = 'flowchat-sync';

async function getContactLabelNames(sql: AppSql, contactId: string): Promise<string[]> {
  const rows = await sql`
    SELECT l.name
    FROM contact_labels cl
    INNER JOIN labels l ON l.id = cl.label_id
    WHERE cl.contact_id = ${contactId}::uuid
    ORDER BY l.name
  `;
  return rows.map((row) => (row as { name: string }).name);
}

type IntegrationRow = {
  external_id: string;
  settings: Record<string, unknown>;
};

async function getWhatsAppIntegration(sql: AppSql, accountId: string) {
  const rows = await sql`
    SELECT external_id, settings
    FROM account_integrations
    WHERE account_id = ${accountId}::uuid
      AND integration_type = 'whatsapp_crm'
      AND sync_enabled = true
    LIMIT 1
  `;
  return (rows[0] as IntegrationRow | undefined) ?? null;
}

export async function pushContactToWhatsAppCrm(
  sql: AppSql,
  accountId: string,
  contact: ContactRecord
) {
  const integration = await getWhatsAppIntegration(sql, accountId);
  if (!integration) return { skipped: true as const };

  const settings = integration.settings ?? {};
  const apiKey = typeof settings.apiKey === 'string' ? settings.apiKey : null;
  const baseUrl =
    typeof settings.baseUrl === 'string'
      ? settings.baseUrl.replace(/\/$/, '')
      : process.env.WHATSAPP_CRM_BASE_URL?.replace(/\/$/, '') ??
        'https://www.digitalbrandcast.com/wa-automation';

  if (!apiKey) {
    console.warn('[whatsapp-crm-bridge] missing apiKey in integration settings');
    return { skipped: true as const };
  }

  if (!contact.phone) return { skipped: true as const };

  const labelNames = await getContactLabelNames(sql, contact.id);
  const tags = [...new Set([...labelNames, FLOWCHAT_SYNC_TAG])];

  const res = await fetch(`${baseUrl}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      flowchat_contact_id: contact.id,
      tags,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WhatsApp CRM sync failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return { ok: true as const, data: await res.json() };
}
