import type { AppSql } from '@/lib/db-sql';
import { runContactEnrichment } from '@/lib/companies/enrichment-run';
import type { FieldMappingEntry } from '@/lib/enrichment-field-schemas';
import {
  suggestionKeysFromMappings,
  goalFieldsFromFlowMappings,
  CRM_GOAL_FIELDS,
} from '@/lib/enrichment-field-schemas';

type FlowStep = {
  id: string;
  step_order: number;
  step_type: string;
  config: Record<string, unknown>;
};

type ContactRow = {
  name: string;
  email: string | null;
  phone: string | null;
  customAttributes: Record<string, unknown>;
};

function readCustomString(attrs: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = attrs[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function evaluateCondition(contact: ContactRow, config: Record<string, unknown>): boolean {
  const field = String(config.field ?? 'email');
  const operator = String(config.operator ?? 'exists');
  const value = config.value != null ? String(config.value) : '';

  let actual: string | null = null;
  if (field === 'phone') actual = contact.phone;
  else if (field === 'name') actual = contact.name;
  else if (field === 'linkedin') {
    actual = readCustomString(
      contact.customAttributes,
      'linkedin_url',
      'leadmonitor_post_url',
      'person_linkedin_url'
    );
  } else actual = contact.email;

  switch (operator) {
    case 'exists':
      return Boolean(actual?.trim());
    case 'not_exists':
      return !actual?.trim();
    case 'equals':
      return (actual ?? '').toLowerCase() === value.toLowerCase();
    case 'contains':
      return (actual ?? '').toLowerCase().includes(value.toLowerCase());
    default:
      return true;
  }
}

async function loadProviderMappings(
  sql: AppSql,
  accountId: string,
  provider: string
): Promise<Record<string, FieldMappingEntry>> {
  const rows = await sql`
    SELECT field_mappings
    FROM enrichment_provider_mappings
    WHERE account_id = ${accountId}::uuid AND provider = ${provider} AND enabled = true
    LIMIT 1
  `;
  const raw = rows[0] as { field_mappings?: Record<string, FieldMappingEntry> } | undefined;
  return raw?.field_mappings ?? {};
}

export type EnrichmentFlowRunResult = {
  ran: boolean;
  flowId?: string;
  suggestions?: { provider: string; fieldCount: number; suggestionId: string }[];
  error?: string;
};

export async function runEnrichmentFlowForContact(
  sql: AppSql,
  accountId: string,
  contactId: string,
  trigger: 'contact_created' | 'manual' | 'leadmonitor_sync' | 'whatsapp_sync',
  options?: { requestedFields?: string[] }
): Promise<EnrichmentFlowRunResult> {
  const flows = await sql`
    SELECT id, name
    FROM enrichment_flows
    WHERE account_id = ${accountId}::uuid AND enabled = true AND trigger_on = ${trigger}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  let flow = flows[0] as { id: string; name: string } | undefined;

  if (!flow && trigger === 'manual') {
    const fallback = await sql`
      SELECT id, name FROM enrichment_flows
      WHERE account_id = ${accountId}::uuid AND enabled = true AND trigger_on = 'contact_created'
      ORDER BY created_at ASC LIMIT 1
    `;
    flow = fallback[0] as { id: string; name: string } | undefined;
  }

  if (!flow) return { ran: false };

  const contactRows = await sql`
    SELECT name, email, phone, custom_attributes as "customAttributes"
    FROM contacts
    WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const contact = contactRows[0] as ContactRow | undefined;
  if (!contact) return { ran: false };

  const steps = (await sql`
    SELECT id, step_order, step_type, config
    FROM enrichment_flow_steps
    WHERE flow_id = ${flow.id}::uuid
    ORDER BY step_order ASC
  `) as FlowStep[];

  const suggestions: { provider: string; fieldCount: number; suggestionId: string }[] = [];

  for (const step of steps) {
    if (step.step_type === 'condition') {
      if (!evaluateCondition(contact, step.config)) break;
      continue;
    }
    if (step.step_type === 'delay') {
      const seconds = Number(step.config.seconds ?? 0);
      if (seconds > 0 && seconds <= 30) {
        await new Promise((r) => setTimeout(r, seconds * 1000));
      }
      continue;
    }
    if (step.step_type === 'provider') {
      const credentialId = step.config.credentialId as string | undefined;
      const provider = String(step.config.provider ?? '');
      const rawScope = String(step.config.scope ?? 'auto');
      const scope =
        rawScope === 'both' || rawScope === 'auto'
          ? ('auto' as const)
          : (rawScope as 'company' | 'person');
      if (!credentialId) continue;

      const mappings = provider ? await loadProviderMappings(sql, accountId, provider) : {};
      const mappedKeys = suggestionKeysFromMappings(mappings);
      const allowedFieldKeys =
        options?.requestedFields && options.requestedFields.length > 0
          ? options.requestedFields
          : mappedKeys.length > 0
            ? mappedKeys
            : undefined;

      const result = await runContactEnrichment(sql, {
        accountId,
        contactId,
        credentialId,
        scope,
        allowedFieldKeys,
      });

      if (!('ok' in result) || result.ok !== true) continue;

      suggestions.push({
        provider: result.suggestion.provider,
        fieldCount: result.fieldCount,
        suggestionId: result.suggestion.id,
      });

      if (result.suggestion.fields.some((f) => f.key === 'contact.email')) {
        const emailField = result.suggestion.fields.find((f) => f.key === 'contact.email');
        if (emailField?.proposed) contact.email = emailField.proposed;
      }
      if (result.suggestion.fields.some((f) => f.key === 'contact.phone')) {
        const phoneField = result.suggestion.fields.find((f) => f.key === 'contact.phone');
        if (phoneField?.proposed) contact.phone = phoneField.proposed;
      }
    }
  }

  return {
    ran: true,
    flowId: flow.id,
    suggestions,
  };
}

export async function getManualEnrichmentTargets(
  sql: AppSql,
  accountId: string
): Promise<{ key: string; label: string; group: string }[]> {
  const mappingsRows = await sql`
    SELECT provider, field_mappings
    FROM enrichment_provider_mappings
    WHERE account_id = ${accountId}::uuid AND enabled = true
  `;

  const mappingsByProvider: Record<string, Record<string, FieldMappingEntry>> = {};
  for (const row of mappingsRows as { provider: string; field_mappings: Record<string, FieldMappingEntry> }[]) {
    mappingsByProvider[row.provider] = row.field_mappings ?? {};
  }

  if (Object.keys(mappingsByProvider).length === 0) {
    return CRM_GOAL_FIELDS.filter((f) =>
      ['contact.email', 'contact.personalEmail', 'contact.phone', 'person.linkedinUrl', 'contact.firstName', 'contact.lastName'].includes(
        f.key
      )
    ).map((f) => ({ key: f.key, label: f.label, group: f.group }));
  }

  return goalFieldsFromFlowMappings(mappingsByProvider);
}
