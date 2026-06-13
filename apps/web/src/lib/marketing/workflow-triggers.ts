import type { AppSql } from '@/lib/db-sql';
import { enrollContactInWorkflow } from '@/lib/marketing/workflow-engine';

export type WorkflowTriggerType = 'contact_created' | 'label_added' | 'conversation_resolved';

export async function triggerMarketingWorkflows(
  sql: AppSql,
  accountId: string,
  triggerType: WorkflowTriggerType,
  contactId: string,
  context?: { labelId?: string }
): Promise<void> {
  const workflows = await sql`
    SELECT id, trigger_config as "triggerConfig", max_enrollments as "maxEnrollments"
    FROM marketing_workflows
    WHERE account_id = ${accountId}::uuid AND enabled = true AND trigger_type = ${triggerType}
  `;

  for (const wf of workflows as {
    id: string;
    triggerConfig: { labelId?: string };
    maxEnrollments: number | null;
  }[]) {
    if (triggerType === 'label_added') {
      const requiredLabel = wf.triggerConfig?.labelId;
      if (requiredLabel && requiredLabel !== context?.labelId) continue;
    }

    if (wf.maxEnrollments != null) {
      const counts = await sql`
        SELECT COUNT(*)::int as count FROM marketing_workflow_enrollments
        WHERE workflow_id = ${wf.id}::uuid
      `;
      if (((counts[0] as { count: number }).count ?? 0) >= wf.maxEnrollments) continue;
    }

    await enrollContactInWorkflow(sql, accountId, wf.id, contactId);
  }
}
