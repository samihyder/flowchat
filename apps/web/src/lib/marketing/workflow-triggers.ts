import type { AppSql } from '@/lib/db-sql';
import { enrollContactInWorkflow } from '@/lib/marketing/workflow-engine';

export type WorkflowTriggerType = 'contact_created' | 'label_added' | 'conversation_resolved';

/**
 * S6M-9: CRM-triggered marketing workflows are retired.
 * Campaign-only model — outreach starts from Marketing → Campaigns wizard only.
 */
export async function triggerMarketingWorkflows(
  _sql: AppSql,
  _accountId: string,
  _triggerType: WorkflowTriggerType,
  _contactId: string,
  _context?: { labelId?: string }
): Promise<void> {
  return;
}
