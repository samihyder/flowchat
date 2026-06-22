import type { AppSql } from '@/lib/db-sql';
import { getAccountSettings } from '@/lib/account-settings-db';
import { describeMarketingEmailRoute } from '@/lib/marketing/email-send';
import { enrollContactInWorkflow, processWorkflowBatch } from '@/lib/marketing/workflow-engine';

export type AutomationEmailInput = {
  /** ISO datetime when this email should send */
  sendAt: string;
  /** @deprecated Legacy relative scheduling */
  daysAfterPrevious?: number;
  subject: string;
  htmlBody: string;
  templateId?: string;
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

  validateEmailSchedule(input.emails);

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

  await insertAutomationSteps(sql, accountId, workflowId, input.name, input.emails);

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

function validateEmailSchedule(emails: AutomationEmailInput[]) {
  let previous: Date | null = null;
  for (let i = 0; i < emails.length; i++) {
    const sendAt = resolveSendAt(emails, i);
    if (!sendAt) throw new Error(`Email ${i + 1} needs a send date and time`);
    if (sendAt.getTime() <= Date.now()) {
      throw new Error(`Email ${i + 1} must be scheduled in the future`);
    }
    if (previous && sendAt.getTime() <= previous.getTime()) {
      throw new Error(`Email ${i + 1} must be scheduled after email ${i}`);
    }
    previous = sendAt;
  }
}

function resolveSendAt(emails: AutomationEmailInput[], index: number): Date | null {
  const email = emails[index]!;
  if (email.sendAt) {
    const d = new Date(email.sendAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (index === 0) return new Date();
  const days = Math.max(0, Number(email.daysAfterPrevious) || 0);
  const prev = resolveSendAt(emails, index - 1) ?? new Date();
  return new Date(prev.getTime() + days * 24 * 60 * 60 * 1000);
}

async function insertAutomationSteps(
  sql: AppSql,
  accountId: string,
  workflowId: string,
  automationName: string,
  emails: AutomationEmailInput[]
) {
  let stepOrder = 0;
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]!;
    const sendAt = resolveSendAt(emails, i)!;
    const sendAtIso = sendAt.toISOString();

    if (sendAt.getTime() > Date.now()) {
      stepOrder++;
      await sql`
        INSERT INTO marketing_workflow_steps (workflow_id, step_order, step_type, config)
        VALUES (
          ${workflowId}::uuid,
          ${stepOrder},
          'wait',
          ${JSON.stringify({ until: sendAtIso })}::jsonb
        )
      `;
    }

    let templateId = email.templateId ?? null;
    if (!templateId && email.htmlBody.trim()) {
      if (email.saveAsTemplate) {
        const tplName = email.templateName?.trim() || `${automationName.trim()} — Email ${i + 1}`;
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
      ? { templateId, subject: email.subject.trim(), sendAt: sendAtIso }
      : { subject: email.subject.trim(), htmlBody: email.htmlBody.trim(), sendAt: sendAtIso };

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
}

export async function getAutomationEditPayload(sql: AppSql, accountId: string, workflowId: string) {
  const wfRows = await sql`
    SELECT id, name, enabled, sender_id as "senderId"
    FROM marketing_workflows
    WHERE id = ${workflowId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!wfRows[0]) return null;

  const steps = await sql`
    SELECT step_order as "stepOrder", step_type as "stepType", config
    FROM marketing_workflow_steps
    WHERE workflow_id = ${workflowId}::uuid
    ORDER BY step_order ASC
  `;

  let pendingUntil: string | undefined;
  const emails: AutomationEmailInput[] = [];

  for (const step of steps as { stepType: string; config: Record<string, unknown> }[]) {
    if (step.stepType === 'wait') {
      const until = step.config.until;
      if (typeof until === 'string' && until) pendingUntil = until;
      else {
        const hours = Number(step.config.hours ?? 0);
        if (hours > 0 && emails.length > 0) {
          const last = emails[emails.length - 1]!;
          const base = new Date(last.sendAt);
          pendingUntil = new Date(base.getTime() + hours * 3600_000).toISOString();
        }
      }
    } else if (step.stepType === 'send_email') {
      const config = step.config;
      const templateId = typeof config.templateId === 'string' ? config.templateId : undefined;
      let htmlBody = typeof config.htmlBody === 'string' ? config.htmlBody : '';
      if (templateId) {
        const tplRows = await sql`
          SELECT html_body as "htmlBody" FROM email_templates
          WHERE id = ${templateId}::uuid AND account_id = ${accountId}::uuid
          LIMIT 1
        `;
        htmlBody = (tplRows[0] as { htmlBody: string } | undefined)?.htmlBody ?? htmlBody;
      }
      const sendAt =
        (typeof config.sendAt === 'string' && config.sendAt) ||
        pendingUntil ||
        new Date().toISOString();
      emails.push({
        sendAt,
        subject: String(config.subject ?? ''),
        htmlBody,
        templateId,
      });
      pendingUntil = undefined;
    }
  }

  const contactRows = await sql`
    SELECT contact_id as "contactId"
    FROM marketing_workflow_enrollments
    WHERE workflow_id = ${workflowId}::uuid AND status IN ('active', 'completed')
  `;

  return {
    name: (wfRows[0] as { name: string }).name,
    senderId: (wfRows[0] as { senderId: string | null }).senderId ?? '',
    enabled: Boolean((wfRows[0] as { enabled: boolean }).enabled),
    contactIds: (contactRows as { contactId: string }[]).map((r) => r.contactId),
    emails: emails.length ? emails : [{ sendAt: new Date(Date.now() + 3600_000).toISOString(), subject: '', htmlBody: '<p></p>' }],
  };
}

export async function updateEmailAutomation(
  sql: AppSql,
  accountId: string,
  workflowId: string,
  input: CreateAutomationInput
): Promise<{ enrolled: number; skipped: number }> {
  if (!input.name.trim()) throw new Error('Automation name is required');
  if (!input.contactIds.length) throw new Error('Select at least one contact');
  if (!input.emails.length) throw new Error('Add at least one email');

  validateEmailSchedule(input.emails);

  const existing = await sql`
    SELECT id FROM marketing_workflows
    WHERE id = ${workflowId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing[0]) throw new Error('Automation not found');

  await sql`
    UPDATE marketing_workflows
    SET name = ${input.name.trim()},
        sender_id = ${input.senderId ?? null}::uuid,
        updated_at = NOW()
    WHERE id = ${workflowId}::uuid AND account_id = ${accountId}::uuid
  `;

  await sql`DELETE FROM marketing_workflow_steps WHERE workflow_id = ${workflowId}::uuid`;
  await insertAutomationSteps(sql, accountId, workflowId, input.name, input.emails);

  // Schedule changed — drop prior send stats so counts match the new run.
  await sql`
    DELETE FROM contact_email_events
    WHERE event_type IN ('workflow_sent', 'workflow_send_failed')
      AND metadata->>'workflowId' = ${workflowId}
  `;

  // New schedule replaces steps — restart active enrollments from the beginning.
  await sql`
    UPDATE marketing_workflow_enrollments
    SET current_step_order = 0,
        next_run_at = NOW(),
        branch_context = '{}'::jsonb
    WHERE workflow_id = ${workflowId}::uuid
      AND status = 'active'
  `;

  const enrolledRows = await sql`
    SELECT contact_id as "contactId", status
    FROM marketing_workflow_enrollments
    WHERE workflow_id = ${workflowId}::uuid
  `;
  const enrolledMap = new Map(
    (enrolledRows as { contactId: string; status: string }[]).map((r) => [r.contactId, r.status])
  );
  const desired = new Set(input.contactIds);
  let enrolled = 0;
  let skipped = 0;

  for (const contactId of input.contactIds) {
    if (!enrolledMap.has(contactId)) {
      const result = await enrollContactInWorkflow(sql, accountId, workflowId, contactId);
      if (result.enrolled) enrolled++;
      else skipped++;
    } else if (enrolledMap.get(contactId) === 'cancelled') {
      await sql`
        UPDATE marketing_workflow_enrollments
        SET status = 'active', current_step_order = 0, next_run_at = NOW(), completed_at = NULL
        WHERE workflow_id = ${workflowId}::uuid AND contact_id = ${contactId}::uuid
      `;
      enrolled++;
    }
  }

  for (const [contactId, status] of enrolledMap) {
    if (!desired.has(contactId) && status === 'active') {
      await sql`
        UPDATE marketing_workflow_enrollments
        SET status = 'cancelled'
        WHERE workflow_id = ${workflowId}::uuid AND contact_id = ${contactId}::uuid
      `;
    }
  }

  await processWorkflowBatch(sql, accountId, 50);
  return { enrolled, skipped };
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
      e.next_run_at as "nextRunAt",
      e.enrolled_at as "enrolledAt",
      c.marketing_status as "marketingStatus",
      e.completed_at as "completedAt",
      (
        SELECT COUNT(*)::int FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'workflow_sent'
          AND ev.metadata->>'workflowId' = ${workflowId}
          AND ev.metadata->>'messageId' IS NOT NULL
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
      ) as "bounced",
      (
        SELECT ev.metadata->>'messageId' FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'workflow_sent'
          AND ev.metadata->>'workflowId' = ${workflowId}
          AND ev.metadata->>'messageId' IS NOT NULL
        ORDER BY ev.created_at DESC LIMIT 1
      ) as "lastMessageId",
      (
        SELECT ev.metadata->>'provider' FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'workflow_sent'
          AND ev.metadata->>'workflowId' = ${workflowId}
        ORDER BY ev.created_at DESC LIMIT 1
      ) as "lastProvider",
      (
        SELECT ev.metadata->>'error' FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'workflow_send_failed'
          AND ev.metadata->>'workflowId' = ${workflowId}
        ORDER BY ev.created_at DESC LIMIT 1
      ) as "lastSendError",
      (
        SELECT ev.created_at FROM contact_email_events ev
        WHERE ev.contact_id = c.id
          AND ev.event_type = 'workflow_sent'
          AND ev.metadata->>'workflowId' = ${workflowId}
          AND ev.metadata->>'messageId' IS NOT NULL
        ORDER BY ev.created_at DESC LIMIT 1
      ) as "lastSentAt"
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
    nextRunAt: Date | null;
    marketingStatus: string;
    enrolledAt: Date;
    completedAt: Date | null;
    emailsSent: number;
    opened: boolean;
    clicked: boolean;
    bounced: boolean;
    lastMessageId: string | null;
    lastProvider: string | null;
    lastSendError: string | null;
    lastSentAt: Date | null;
  }[];

  const settings = await getAccountSettings(sql, accountId);
  const senderId = (wfRows[0] as { senderId: string | null }).senderId;
  const emailRoute = await describeMarketingEmailRoute(sql, accountId, settings, senderId);

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
      nextRunAt: r.nextRunAt ? new Date(r.nextRunAt).toISOString() : null,
      enrolledAt: new Date(r.enrolledAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      lastSentAt: r.lastSentAt ? new Date(r.lastSentAt).toISOString() : null,
      status: r.bounced
        ? 'bounced'
        : r.clicked
          ? 'clicked'
          : r.opened
            ? 'opened'
            : r.lastSendError && r.emailsSent === 0 && r.enrollmentStatus === 'active'
              ? 'send_failed'
            : r.enrollmentStatus === 'active' &&
                r.nextRunAt &&
                new Date(r.nextRunAt).getTime() > Date.now()
              ? 'waiting'
            : r.emailsSent > 0
              ? 'sent'
              : r.enrollmentStatus === 'cancelled' && r.marketingStatus !== 'subscribed'
                ? 'not_subscribed'
                : r.enrollmentStatus === 'active'
                  ? 'waiting'
                  : r.enrollmentStatus,
    })),
    emailRoute,
  };
}
