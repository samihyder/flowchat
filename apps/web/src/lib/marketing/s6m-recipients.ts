import type { AppSql } from '@/lib/db-sql';
import { MarketingError, MarketingErrorCode } from '@/lib/marketing/errors';
import { getMarketingCampaign } from '@/lib/marketing/s6m-campaigns';
import { previewSegmentContacts, resolveSegmentContacts } from '@/lib/marketing/segments';

export type RecipientDisplayStatus = 'subscribed' | 'suppressed' | 'no_email';

export type CampaignRecipientRow = {
  contactId: string;
  name: string;
  email: string;
  company: string | null;
  marketingStatus: string;
  recipientStatus: RecipientDisplayStatus;
  exclusionReason: string | null;
};

export type PutRecipientsResult = {
  selected: number;
  excluded: {
    suppressed: number;
    reasons: Record<string, number>;
  };
  recipients: CampaignRecipientRow[];
};

type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  marketingStatus: string;
  marketingPreference: string;
  customAttributes: Record<string, unknown> | null;
};

async function loadContactsByIds(
  sql: AppSql,
  accountId: string,
  contactIds: string[]
): Promise<ContactRow[]> {
  if (contactIds.length === 0) return [];
  return (await sql`
    SELECT
      c.id,
      c.name,
      c.email,
      c.marketing_status as "marketingStatus",
      c.marketing_preference as "marketingPreference",
      c.custom_attributes as "customAttributes"
    FROM contacts c
    WHERE c.account_id = ${accountId}::uuid
      AND c.id = ANY(${contactIds}::uuid[])
  `) as ContactRow[];
}

async function suppressedEmails(
  sql: AppSql,
  accountId: string,
  emails: string[]
): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const rows = (await sql`
    SELECT lower(email) as email
    FROM marketing_suppressions
    WHERE account_id = ${accountId}::uuid
      AND lower(email) = ANY(${emails.map((e) => e.toLowerCase())}::text[])
  `) as { email: string }[];
  return new Set(rows.map((r) => r.email));
}

function companyFromAttributes(attrs: Record<string, unknown> | null): string | null {
  if (!attrs || typeof attrs.company !== 'string') return null;
  const trimmed = attrs.company.trim();
  return trimmed || null;
}

export function classifyRecipient(contact: ContactRow, suppressed: Set<string>): {
  eligible: boolean;
  recipientStatus: RecipientDisplayStatus;
  exclusionReason: string | null;
} {
  const email = contact.email?.trim() ?? '';
  if (!email) {
    return { eligible: false, recipientStatus: 'no_email', exclusionReason: 'no_email' };
  }

  if (contact.marketingStatus === 'unsubscribed') {
    return { eligible: false, recipientStatus: 'suppressed', exclusionReason: 'unsubscribed' };
  }
  if (contact.marketingStatus === 'bounced') {
    return { eligible: false, recipientStatus: 'suppressed', exclusionReason: 'bounced' };
  }
  if (contact.marketingStatus === 'complained') {
    return { eligible: false, recipientStatus: 'suppressed', exclusionReason: 'complained' };
  }
  if (contact.marketingStatus === 'pending') {
    return { eligible: false, recipientStatus: 'suppressed', exclusionReason: 'pending' };
  }
  if (contact.marketingPreference && contact.marketingPreference !== 'all') {
    return { eligible: false, recipientStatus: 'suppressed', exclusionReason: 'preference' };
  }
  if (suppressed.has(email.toLowerCase())) {
    return { eligible: false, recipientStatus: 'suppressed', exclusionReason: 'suppressed' };
  }

  return { eligible: true, recipientStatus: 'subscribed', exclusionReason: null };
}

function toRecipientRow(contact: ContactRow, suppressed: Set<string>): CampaignRecipientRow {
  const { recipientStatus, exclusionReason } = classifyRecipient(contact, suppressed);
  return {
    contactId: contact.id,
    name: contact.name,
    email: contact.email?.trim() ?? '',
    company: companyFromAttributes(contact.customAttributes),
    marketingStatus: contact.marketingStatus,
    recipientStatus,
    exclusionReason,
  };
}

export async function getCampaignRecipients(
  sql: AppSql,
  accountId: string,
  campaignId: string
): Promise<{
  contactIds: string[];
  recipients: CampaignRecipientRow[];
  summary: { selected: number; suppressed: number };
}> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Campaign not found' });
  }

  const memberRows = (await sql`
    SELECT contact_id as "contactId"
    FROM marketing_campaign_recipients
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY enrolled_at ASC
  `) as { contactId: string }[];

  const contactIds = memberRows.map((r) => r.contactId);
  const contacts = await loadContactsByIds(sql, accountId, contactIds);
  const emails = contacts.map((c) => c.email?.trim() ?? '').filter(Boolean);
  const suppressed = await suppressedEmails(sql, accountId, emails);

  const byId = new Map(contacts.map((c) => [c.id, c]));
  const recipients = contactIds
    .map((id) => byId.get(id))
    .filter((c): c is ContactRow => Boolean(c))
    .map((c) => toRecipientRow(c, suppressed));

  const selected = recipients.filter((r) => r.recipientStatus === 'subscribed').length;
  const suppressedCount = recipients.length - selected;

  return {
    contactIds,
    recipients,
    summary: { selected, suppressed: suppressedCount },
  };
}

export async function putCampaignRecipients(
  sql: AppSql,
  accountId: string,
  campaignId: string,
  contactIds: string[]
): Promise<PutRecipientsResult> {
  const campaign = await getMarketingCampaign(sql, accountId, campaignId);
  if (!campaign) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Campaign not found' });
  }
  if (campaign.status !== 'draft') {
    throw new MarketingError(MarketingErrorCode.CONFLICT, {
      message: 'Recipients can only be edited while the campaign is a draft',
    });
  }

  const uniqueIds = [...new Set(contactIds)];
  if (uniqueIds.length === 0) {
    throw new MarketingError(MarketingErrorCode.RECIPIENTS_REQUIRED);
  }

  const contacts = await loadContactsByIds(sql, accountId, uniqueIds);
  if (contacts.length !== uniqueIds.length) {
    throw new MarketingError(MarketingErrorCode.VALIDATION, {
      message: 'One or more contacts were not found',
    });
  }

  const emails = contacts.map((c) => c.email?.trim() ?? '').filter(Boolean);
  const suppressedSet = await suppressedEmails(sql, accountId, emails);

  const recipients = contacts.map((c) => toRecipientRow(c, suppressedSet));
  const eligible = recipients.filter((r) => r.recipientStatus === 'subscribed');

  if (eligible.length === 0) {
    throw new MarketingError(MarketingErrorCode.ALL_SUPPRESSED);
  }

  const reasons: Record<string, number> = {};
  for (const r of recipients) {
    if (r.exclusionReason) {
      reasons[r.exclusionReason] = (reasons[r.exclusionReason] ?? 0) + 1;
    }
  }

  const eligibleIds = eligible.map((r) => r.contactId);

  await sql`DELETE FROM marketing_campaign_recipients WHERE campaign_id = ${campaignId}::uuid`;

  if (eligibleIds.length > 0) {
    await sql`
      INSERT INTO marketing_campaign_recipients (campaign_id, contact_id, email)
      SELECT ${campaignId}::uuid, c.id, c.email
      FROM contacts c
      WHERE c.id = ANY(${eligibleIds}::uuid[])
        AND c.account_id = ${accountId}::uuid
    `;
  }

  await sql`
    UPDATE marketing_campaigns
    SET updated_at = NOW()
    WHERE id = ${campaignId}::uuid AND account_id = ${accountId}::uuid
  `;

  const excludedCount = recipients.length - eligible.length;

  return {
    selected: eligible.length,
    excluded: {
      suppressed: excludedCount,
      reasons,
    },
    recipients,
  };
}

export async function getSegmentImportContactIds(
  sql: AppSql,
  accountId: string,
  segmentId: string
): Promise<{ contactIds: string[]; segmentType: string; previewCount: number }> {
  const [segment] = (await sql`
    SELECT id, type
    FROM marketing_segments
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `) as { id: string; type: string }[];

  if (!segment) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Segment not found' });
  }

  if (segment.type === 'static') {
    const rows = (await sql`
      SELECT c.id
      FROM marketing_segment_members sm
      INNER JOIN contacts c ON c.id = sm.contact_id
      WHERE sm.segment_id = ${segmentId}::uuid
        AND c.account_id = ${accountId}::uuid
        AND c.email IS NOT NULL
        AND c.email <> ''
    `) as { id: string }[];
    return {
      contactIds: rows.map((r) => r.id),
      segmentType: 'static',
      previewCount: rows.length,
    };
  }

  const dynamic = await resolveSegmentContacts(sql, accountId, segmentId);
  return {
    contactIds: dynamic.map((c) => c.id),
    segmentType: 'dynamic',
    previewCount: dynamic.length,
  };
}

export async function previewSegmentImport(
  sql: AppSql,
  accountId: string,
  segmentId: string,
  limit = 5
) {
  const segment = (await sql`
    SELECT id, name, type
    FROM marketing_segments
    WHERE id = ${segmentId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `) as { id: string; name: string; type: string }[];

  if (!segment[0]) {
    throw new MarketingError(MarketingErrorCode.NOT_FOUND, { message: 'Segment not found' });
  }

  const preview = await previewSegmentContacts(sql, accountId, segmentId, limit);
  const { contactIds, previewCount } = await getSegmentImportContactIds(sql, accountId, segmentId);

  return {
    segment: segment[0],
    previewCount,
    preview,
    contactIds,
  };
}
