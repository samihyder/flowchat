import type { AppSql } from '@/lib/db-sql';
import { enrollContactInWorkflow } from '@/lib/marketing/workflow-engine';

export type WorkflowTriggerType = 'contact_created' | 'label_added' | 'conversation_resolved';

/**
 * S6M-9 complete: CRM-triggered marketing workflows are retired.
 * Kept as a no-op export so any stray callers fail closed.
 * Outreach starts from Marketing → Campaigns wizard only.
 * Lead Monitor / LeadSnapper contact sync must not enroll marketing.
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
