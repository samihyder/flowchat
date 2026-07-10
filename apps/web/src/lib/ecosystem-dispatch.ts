import type { AppSql } from '@/lib/db-sql';
import { getAccountSettings } from '@/lib/account-settings-db';
import type { ContactRecord } from '@/lib/contact-sync';
import { pushContactToWhatsAppCrm } from '@/lib/whatsapp-crm-bridge';
import { runEnrichmentFlowForContact } from '@/lib/enrichment-flow-runner';

export async function dispatchEcosystemContactSync(
  sql: AppSql,
  accountId: string,
  contact: ContactRecord,
  created: boolean
) {
  const settings = await getAccountSettings(sql, accountId);

  if (settings.whatsappCrmSyncEnabled && contact.phone) {
    void pushContactToWhatsAppCrm(sql, accountId, contact).catch((err) => {
      console.error('[ecosystem] whatsapp sync failed', err);
    });
  }

  if (created) {
    void runEnrichmentFlowForContact(sql, accountId, contact.id, 'contact_created').catch(
      (err) => {
        console.error('[ecosystem] enrichment flow failed', err);
      }
    );
  }
}
