import type { AppSql } from '@/lib/db-sql';
import { enrollContactInWorkflow, processWorkflowBatch } from '@/lib/marketing/workflow-engine';

export type AutomationEmailInput = {
  /** Days to wait after the previous email (0 = send immediately / first email) */
  daysAfterPrevious: number;
  subject: string;
  htmlBody: string;
  /** Reuse an existing template instead of inline htmlBody */
  templateId?: string;
  /** Save this email as a reusable template */
  saveAsTemplate?: boolean;
  templateName?: string;
};

export type CreateAutomationInput = {
  name: string;
  senderId?: string;
  contactIds: string[];
  emails: AutomationEmailInput[];
};

export async function createEmailAutomation(
  sql: AppSql,
  accountId: string,
  input: CreateAutomationInput
): Promise<{ workflowId: string; enrolled: number; skipped: number }> {
  if (!input.name.trim()) throw new Error('Automation name is required');
  if (!input.contactIds.length) throw new Error('Select at least one contact');
  if (!input.emails.length) throw new Error('Add at least one email');

  const wfRows = await sql`
    INSERT INTO marketing_workflows (
      account_id, name, trigger_type, trigger_config, sender_id, enabled, allow_reentry
    ) VALUES (
      ${accountId}::uuid,
      ${input.name.trim()},
      'manual',
      '{}'::jsonb,
      ${input.senderId ?? null}::uuid,
      true,
      false
    )
    RETURNING id
  `;
  const workflowId = (wfRows[0] as { id: string }).id;

  let stepOrder = 0;
  for (let i = 0; i < input.emails.length; i++) {
    const email = input.emails[i]!;
    const days = Math.max(0, Number(email.daysAfterPrevious) || 0);

    if (i > 0 && days > 0) {
      stepOrder++;
      await sql`
        INSERT INTO marketing_workflow_steps (workflow_id, step_order, step_type, config)
        VALUES (
          ${workflowId}::uuid,
          ${stepOrder},
          'wait',
          ${JSON.stringify({ hours: days * 24 })}::jsonb
        )
      `;
    }

    let templateId = email.templateId ?? null;
    if (!templateId && email.htmlBody.trim()) {
      if (email.saveAsTemplate) {
        const tplName =
          email.templateName?.trim() ||
          `${input.name.trim()} — Email ${i + 1}`;
        const tplRows = await sql`
          INSERT INTO email_templates (account_id, name, subject, html_body)
          VALUES (
            ${accountId}::uuid,
            ${tplName},
            ${email.subject.trim()},
            ${email.htmlBody.trim()}
          )
          RETURNING id
        `;
        templateId = (tplRows[0] as { id: string }).id;
      }
    }

    stepOrder++;
    const config: Record<string, unknown> = templateId
      ? { templateId, subject: email.subject.trim() }
      : { subject: email.subject.trim(), htmlBody: email.htmlBody.trim() };

    await sql`
      INSERT INTO marketing_workflow_steps (workflow_id, step_order, step_type, config)
      VALUES (
        ${workflowId}::uuid,
        ${stepOrder},
        'send_email',
        ${JSON.stringify(config)}::jsonb
      )
    `;
  }

  stepOrder++;
  await sql`
    INSERT INTO marketing_workflow_steps (workflow_id, step_order, step_type, config)
    VALUES (${workflowId}::uuid, ${stepOrder}, 'exit', '{}'::jsonb)
  `;

  let enrolled = 0;
  let skipped = 0;
  for (const contactId of input.contactIds) {
    const result = await enrollContactInWorkflow(sql, accountId, workflowId, contactId);
    if (result.enrolled) enrolled++;
    else skipped++;
  }

  await processWorkflowBatch(sql, accountId, 50);

  return { workflowId, enrolled, skipped };
}

export async function getAutomationStats(sql: AppSql, accountId: string, workflowId: string) {
  const wfRows = await sql`
    SELECT w.id, w.name, w.enabled, w.sender_id as "senderId", w.created_at as "createdAt",
           (SELECT COUNT(*)::int FROM marketing_workflow_enrollments e WHERE e.workflow_id = w.id) as "totalEnrolled",
           (SELECT COUNT(*)::int FROM marketing_workflow_enrollments e WHERE e.workflow_id = w.id AND e.status = 'active') as "activeEnrolled",
           (SELECT COUNT(*)::int FROM marketing_workflow_enrollments e WHERE e.workflow_id = w.id AND e.status = 'completed') as "completedEnrolled"
    FROM marketing_workflows w
    WHERE w.id = ${workflowId}::uuid AND w.account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!wfRows[0]) return null;

  const steps = await sql`
    SELECT step_order as "stepOrder", step_type as "stepType", config
    FROM marketing_workflow_steps
    WHERE workflow_id = ${workflowId}::uuid
    ORDER BY step_order ASC
  `;

  const emailSteps = (steps as { stepOrder: number; stepType: string; config: Record<string, unknown> }[]).filter(
    (s) => s.stepType === 'send_email'
  );

  const recipients = await sql`
    SELECT
      c.id as "contactId",
      c.name,
      c.email,
      e.status as "enrollmentStatus",
      e.current_step_order as "currentStepOrder",
      e.enrolled_at as "enrolledAt",
      e.completed_at as "completedAt",
      (
        SELECT COUNT(*)::int FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'workflow_sent'
          AND ev.metadata->>'workflowId' = ${workflowId}
      ) as "emailsSent",
      EXISTS (
        SELECT 1 FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type IN ('opened', 'clicked')
          AND ev.metadata->>'workflowId' = ${workflowId}
      ) as "opened",
      EXISTS (
        SELECT 1 FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'clicked'
          AND ev.metadata->>'workflowId' = ${workflowId}
      ) as "clicked",
      EXISTS (
        SELECT 1 FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type IN ('bounced', 'complained')
          AND ev.metadata->>'workflowId' = ${workflowId}
      ) as "bounced"
    FROM marketing_workflow_enrollments e
    INNER JOIN contacts c ON c.id = e.contact_id
    WHERE e.workflow_id = ${workflowId}::uuid
    ORDER BY c.name ASC
  `;

  const rows = recipients as {
    contactId: string;
    name: string;
    email: string | null;
    enrollmentStatus: string;
    currentStepOrder: number;
    enrolledAt: Date;
    completedAt: Date | null;
    emailsSent: number;
    opened: boolean;
    clicked: boolean;
    bounced: boolean;
  }[];

  const sent = rows.reduce((n, r) => n + r.emailsSent, 0);
  const opened = rows.filter((r) => r.opened).length;
  const clicked = rows.filter((r) => r.clicked).length;
  const bounced = rows.filter((r) => r.bounced).length;
  const notOpened = rows.filter((r) => r.emailsSent > 0 && !r.opened && !r.bounced).length;

  return {
    workflow: {
      ...(wfRows[0] as Record<string, unknown>),
      createdAt: new Date((wfRows[0] as { createdAt: Date }).createdAt).toISOString(),
      emailCount: emailSteps.length,
    },
    steps,
    summary: {
      totalContacts: rows.length,
      emailsSent: sent,
      opened,
      clicked,
      bounced,
      notOpened,
      openRate: sent > 0 ? Math.round((opened / rows.length) * 100) : 0,
      clickRate: sent > 0 ? Math.round((clicked / rows.length) * 100) : 0,
    },
    recipients: rows.map((r) => ({
      ...r,
      enrolledAt: new Date(r.enrolledAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      status: r.bounced
        ? 'bounced'
        : r.clicked
          ? 'clicked'
          : r.opened
            ? 'opened'
            : r.emailsSent > 0
              ? 'delivered'
              : r.enrollmentStatus === 'active'
                ? 'waiting'
                : r.enrollmentStatus,
    })),
  };
}
