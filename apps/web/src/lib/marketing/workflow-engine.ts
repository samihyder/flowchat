import type { AppSql } from '@/lib/db-sql';
import { getAccountSettings } from '@/lib/account-settings-db';
import { applyMergeTags } from '@/lib/marketing/merge-tags';
import { sendMarketingEmail } from '@/lib/marketing/email-send';

type WorkflowStep = {
  id: string;
  stepOrder: number;
  stepType: string;
  config: Record<string, unknown>;
};

async function contactOpenedWorkflowEmail(
  sql: AppSql,
  accountId: string,
  contactId: string,
  workflowId: string
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM contact_email_events
    WHERE account_id = ${accountId}::uuid AND contact_id = ${contactId}::uuid
      AND event_type IN ('opened', 'clicked')
      AND metadata->>'workflowId' = ${workflowId}
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

export async function enrollContactInWorkflow(
  sql: AppSql,
  accountId: string,
  workflowId: string,
  contactId: string
): Promise<{ enrolled: boolean; reason?: string }> {
  const workflows = await sql`
    SELECT id, enabled, allow_reentry as "allowReentry", max_enrollments as "maxEnrollments"
    FROM marketing_workflows
    WHERE id = ${workflowId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const wf = workflows[0] as { enabled: boolean; allowReentry: boolean; maxEnrollments: number | null } | undefined;
  if (!wf?.enabled) return { enrolled: false, reason: 'Workflow disabled' };

  if (wf.maxEnrollments != null) {
    const total = await sql`
      SELECT COUNT(*)::int as count FROM marketing_workflow_enrollments WHERE workflow_id = ${workflowId}::uuid
    `;
    if (((total[0] as { count: number }).count ?? 0) >= wf.maxEnrollments) {
      return { enrolled: false, reason: 'Enrollment cap reached' };
    }
  }

  const existing = await sql`
    SELECT id FROM marketing_workflow_enrollments
    WHERE workflow_id = ${workflowId}::uuid AND contact_id = ${contactId}::uuid AND status = 'active'
    LIMIT 1
  `;
  if (existing[0] && !wf.allowReentry) {
    return { enrolled: false, reason: 'Already enrolled' };
  }

  await sql`
    INSERT INTO marketing_workflow_enrollments (workflow_id, contact_id, current_step_order, status, next_run_at)
    VALUES (${workflowId}::uuid, ${contactId}::uuid, 0, 'active', NOW())
  `;
  return { enrolled: true };
}

async function advanceEnrollment(
  sql: AppSql,
  enrollmentId: string,
  stepOrder: number,
  nextRunAt: Date | null
) {
  await sql`
    UPDATE marketing_workflow_enrollments SET
      current_step_order = ${stepOrder},
      next_run_at = ${nextRunAt ? nextRunAt.toISOString() : null}::timestamptz,
      branch_context = '{}'::jsonb
    WHERE id = ${enrollmentId}::uuid
  `;
}

export async function processWorkflowBatch(
  sql: AppSql,
  accountId: string,
  batchSize = 20
): Promise<{ processed: number }> {
  const settings = await getAccountSettings(sql, accountId);
  const due = await sql`
    SELECT e.id as "enrollmentId", e.workflow_id as "workflowId", e.contact_id as "contactId",
           e.current_step_order as "currentStepOrder", e.branch_context as "branchContext",
           w.sender_id as "senderId"
    FROM marketing_workflow_enrollments e
    INNER JOIN marketing_workflows w ON w.id = e.workflow_id
    WHERE w.account_id = ${accountId}::uuid AND w.enabled = true
      AND e.status = 'active'
      AND (e.next_run_at IS NULL OR e.next_run_at <= NOW())
    ORDER BY e.next_run_at NULLS FIRST
    LIMIT ${batchSize}
  `;

  let processed = 0;
  for (const row of due as {
    enrollmentId: string;
    workflowId: string;
    contactId: string;
    currentStepOrder: number;
    branchContext: Record<string, unknown>;
    senderId: string | null;
  }[]) {
    const steps = await sql`
      SELECT id, step_order as "stepOrder", step_type as "stepType", config
      FROM marketing_workflow_steps WHERE workflow_id = ${row.workflowId}::uuid ORDER BY step_order ASC
    `;
    const allSteps = steps as WorkflowStep[];

    const pendingBranch = row.branchContext?.pendingBranch as
      | { stepOrder: number; condition: string; trueStepOrder: number; falseStepOrder: number }
      | undefined;

    if (pendingBranch) {
      let pass = false;
      if (pendingBranch.condition === 'opened' || pendingBranch.condition === 'clicked') {
        pass = await contactOpenedWorkflowEmail(sql, accountId, row.contactId, row.workflowId);
      } else if (pendingBranch.condition === 'not_opened') {
        pass = !(await contactOpenedWorkflowEmail(sql, accountId, row.contactId, row.workflowId));
      }
      const goto = pass ? pendingBranch.trueStepOrder : pendingBranch.falseStepOrder;
      await advanceEnrollment(sql, row.enrollmentId, goto - 1, new Date());
      processed++;
      continue;
    }

    const nextStep = allSteps.find((s) => s.stepOrder > row.currentStepOrder);
    if (!nextStep) {
      await sql`
        UPDATE marketing_workflow_enrollments SET status = 'completed', completed_at = NOW(), next_run_at = NULL
        WHERE id = ${row.enrollmentId}::uuid
      `;
      processed++;
      continue;
    }

    const contacts = await sql`
      SELECT name, email, phone, type, custom_attributes as "customAttributes", marketing_status as "marketingStatus"
      FROM contacts WHERE id = ${row.contactId}::uuid LIMIT 1
    `;
    const contact = contacts[0] as {
      name: string;
      email: string | null;
      phone: string | null;
      type: string;
      customAttributes: Record<string, unknown>;
      marketingStatus: string;
    } | undefined;
    if (!contact?.email || contact.marketingStatus !== 'subscribed') {
      await sql`
        UPDATE marketing_workflow_enrollments SET status = 'cancelled', completed_at = NOW(), next_run_at = NULL
        WHERE id = ${row.enrollmentId}::uuid
      `;
      processed++;
      continue;
    }

    const mergeCtx = {
      name: contact.name ?? 'there',
      email: contact.email,
      phone: contact.phone,
      type: contact.type,
      customAttributes: contact.customAttributes ?? {},
    };

    if (nextStep.stepType === 'branch') {
      const cfg = nextStep.config;
      const waitHours = Number(cfg.waitHours ?? 24);
      await sql`
        UPDATE marketing_workflow_enrollments SET
          current_step_order = ${nextStep.stepOrder},
          next_run_at = NOW() + (${String(waitHours)}::text || ' hours')::interval,
          branch_context = ${JSON.stringify({
            pendingBranch: {
              stepOrder: nextStep.stepOrder,
              condition: String(cfg.condition ?? 'not_opened'),
              trueStepOrder: Number(cfg.trueStepOrder ?? nextStep.stepOrder + 1),
              falseStepOrder: Number(cfg.falseStepOrder ?? nextStep.stepOrder + 2),
            },
          })}::jsonb
        WHERE id = ${row.enrollmentId}::uuid
      `;
      processed++;
      continue;
    }

    if (nextStep.stepType === 'send_email') {
      const cfg = nextStep.config;
      let subject = String(cfg.subject ?? '');
      let html = String(cfg.htmlBody ?? '');
      let textBody = cfg.textBody ? String(cfg.textBody) : undefined;

      if (cfg.templateId) {
        const tplRows = await sql`
          SELECT subject, html_body as "htmlBody", text_body as "textBody"
          FROM email_templates WHERE id = ${String(cfg.templateId)}::uuid AND account_id = ${accountId}::uuid LIMIT 1
        `;
        const tpl = tplRows[0] as { subject: string; htmlBody: string; textBody: string | null } | undefined;
        if (!tpl) {
          processed++;
          continue;
        }
        subject = String(cfg.subjectPrefix ?? '') + tpl.subject;
        html = tpl.htmlBody;
        textBody = tpl.textBody ?? undefined;
      }

      subject = applyMergeTags(subject, mergeCtx);
      html = applyMergeTags(html, mergeCtx);
      const result = await sendMarketingEmail(sql, accountId, row.contactId, settings, {
        to: contact.email,
        subject,
        html,
        text: textBody ? applyMergeTags(textBody, mergeCtx) : undefined,
        senderId: row.senderId,
        mergeContact: mergeCtx,
      });
      if (!result.ok) {
        await sql`
          INSERT INTO contact_email_events (account_id, contact_id, event_type, subject, metadata)
          VALUES (${accountId}::uuid, ${row.contactId}::uuid, 'workflow_send_failed', ${subject},
            ${JSON.stringify({
              workflowId: row.workflowId,
              stepOrder: nextStep.stepOrder,
              error: result.error,
            })}::jsonb)
        `;
        await sql`
          UPDATE marketing_workflow_enrollments
          SET next_run_at = NOW() + interval '2 minutes'
          WHERE id = ${row.enrollmentId}::uuid
        `;
        processed++;
        continue;
      }
      await sql`
        INSERT INTO contact_email_events (account_id, contact_id, event_type, subject, metadata)
        VALUES (${accountId}::uuid, ${row.contactId}::uuid, 'workflow_sent', ${subject},
          ${JSON.stringify({ workflowId: row.workflowId, stepOrder: nextStep.stepOrder })}::jsonb)
      `;
    } else if (nextStep.stepType === 'wait') {
      const until = typeof nextStep.config.until === 'string' ? nextStep.config.until : undefined;
      const nextRunAt = until
        ? new Date(until)
        : new Date(Date.now() + Number(nextStep.config.hours ?? 24) * 3600 * 1000);
      await advanceEnrollment(sql, row.enrollmentId, nextStep.stepOrder, nextRunAt);
      processed++;
      continue;
    } else if (nextStep.stepType === 'add_label') {
      const labelId = nextStep.config.labelId as string | undefined;
      if (labelId) {
        await sql`
          INSERT INTO contact_labels (contact_id, label_id) VALUES (${row.contactId}::uuid, ${labelId}::uuid)
          ON CONFLICT DO NOTHING
        `;
      }
    } else if (nextStep.stepType === 'exit') {
      await sql`
        UPDATE marketing_workflow_enrollments SET status = 'completed', completed_at = NOW(), next_run_at = NULL,
          current_step_order = ${nextStep.stepOrder}
        WHERE id = ${row.enrollmentId}::uuid
      `;
      processed++;
      continue;
    }

    const following = allSteps.find((s) => s.stepOrder > nextStep.stepOrder);
    if (!following) {
      await sql`
        UPDATE marketing_workflow_enrollments SET status = 'completed', completed_at = NOW(), next_run_at = NULL,
          current_step_order = ${nextStep.stepOrder}
        WHERE id = ${row.enrollmentId}::uuid
      `;
    } else if (nextStep.stepType !== 'wait') {
      await advanceEnrollment(sql, row.enrollmentId, nextStep.stepOrder, new Date());
    }
    processed++;
  }

  return { processed };
}
