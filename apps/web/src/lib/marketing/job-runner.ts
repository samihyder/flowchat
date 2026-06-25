import type { AppSql } from '@/lib/db-sql';
import { prepareCampaignSend, processCampaignBatch, pickAbTestWinner } from '@/lib/marketing/campaign-dispatch';
import { processS6mCampaignBatch } from '@/lib/marketing/s6m-campaign-dispatch';
import { processWorkflowBatch } from '@/lib/marketing/workflow-engine';

const BATCH_SIZE = Number(process.env.MARKETING_BATCH_SIZE ?? 25);

export async function runMarketingJobs(sql: AppSql): Promise<{
  scheduledStarted: number;
  campaignsProcessed: number;
  workflowsProcessed: number;
  s6mProcessed: number;
  s6mSent: number;
}> {
  let scheduledStarted = 0;
  let campaignsProcessed = 0;
  let workflowsProcessed = 0;

  const s6m = await processS6mCampaignBatch(sql);

  const dueScheduled = await sql`
    SELECT id, account_id as "accountId"
    FROM email_campaigns
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()
    LIMIT 10
  `;

  for (const row of dueScheduled as { id: string; accountId: string }[]) {
    try {
      await prepareCampaignSend(sql, row.accountId, row.id);
      scheduledStarted++;
    } catch {
      await sql`
        UPDATE email_campaigns SET status = 'draft', updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    }
  }

  const sending = await sql`
    SELECT id, account_id as "accountId"
    FROM email_campaigns
    WHERE status = 'sending'
    LIMIT 20
  `;

  for (const row of sending as { id: string; accountId: string }[]) {
    await pickAbTestWinner(sql, row.accountId, row.id);
    const result = await processCampaignBatch(sql, row.accountId, row.id, BATCH_SIZE);
    campaignsProcessed += result.processed;
  }

  const accounts = await sql`
    SELECT DISTINCT w.account_id as "accountId"
    FROM marketing_workflow_enrollments e
    INNER JOIN marketing_workflows w ON w.id = e.workflow_id
    WHERE e.status = 'active' AND (e.next_run_at IS NULL OR e.next_run_at <= NOW())
    LIMIT 50
  `;

  for (const row of accounts as { accountId: string }[]) {
    const result = await processWorkflowBatch(sql, row.accountId, BATCH_SIZE);
    workflowsProcessed += result.processed;
  }

  return {
    scheduledStarted,
    campaignsProcessed,
    workflowsProcessed,
    s6mProcessed: s6m.processed,
    s6mSent: s6m.sent,
  };
}
