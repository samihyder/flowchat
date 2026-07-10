import type { AppSql } from '@/lib/db-sql';
import { runContactEnrichment } from '@/lib/companies/enrichment-run';

type FlowStep = {
  id: string;
  step_order: number;
  step_type: string;
  config: Record<string, unknown>;
};

function evaluateCondition(
  contact: { email: string | null; phone: string | null; name: string },
  config: Record<string, unknown>
): boolean {
  const field = String(config.field ?? 'email');
  const operator = String(config.operator ?? 'exists');
  const value = config.value != null ? String(config.value) : '';

  const actual =
    field === 'phone' ? contact.phone : field === 'name' ? contact.name : contact.email;

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

export async function runEnrichmentFlowForContact(
  sql: AppSql,
  accountId: string,
  contactId: string,
  trigger: 'contact_created' | 'manual' | 'leadmonitor_sync' | 'whatsapp_sync'
) {
  const flows = await sql`
    SELECT id, name
    FROM enrichment_flows
    WHERE account_id = ${accountId}::uuid AND enabled = true AND trigger_on = ${trigger}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  const flow = flows[0] as { id: string; name: string } | undefined;
  if (!flow) return { ran: false as const };

  const contactRows = await sql`
    SELECT name, email, phone FROM contacts
    WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const contact = contactRows[0] as
    | { name: string; email: string | null; phone: string | null }
    | undefined;
  if (!contact) return { ran: false as const };

  const steps = (await sql`
    SELECT id, step_order, step_type, config
    FROM enrichment_flow_steps
    WHERE flow_id = ${flow.id}::uuid
    ORDER BY step_order ASC
  `) as FlowStep[];

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
      const scope = (step.config.scope as 'company' | 'person' | 'both') ?? 'both';
      if (!credentialId) continue;
      await runContactEnrichment(sql, {
        accountId,
        contactId,
        credentialId,
        scope,
      });
    }
    // condition / delay / webhook steps: v1 runs provider steps only
  }

  return { ran: true as const, flowId: flow.id };
}
