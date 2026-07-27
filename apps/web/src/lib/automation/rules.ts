import type { AppSql } from '@/lib/db-sql';

export type AutomationCondition = {
  id?: string;
  groupIndex: number;
  field: string;
  operator: string;
  value: unknown;
};

export type AutomationAction = {
  id?: string;
  sortOrder: number;
  actionType: string;
  config: Record<string, unknown>;
};

export type AutomationRule = {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  isEnabled: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

export type AutomationRuleInput = {
  name: string;
  description?: string | null;
  triggerEvent: string;
  isEnabled?: boolean;
  sortOrder?: number;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
};

function getContextValue(context: Record<string, unknown>, field: string): unknown {
  const parts = field.split('.');
  let cur: unknown = context;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function evalCondition(cond: AutomationCondition, context: Record<string, unknown>): boolean {
  const left = getContextValue(context, cond.field);
  const right = cond.value;
  const leftStr = left == null ? '' : String(left);
  const rightStr = right == null ? '' : String(right);

  switch (cond.operator) {
    case 'eq':
      return leftStr === rightStr;
    case 'neq':
      return leftStr !== rightStr;
    case 'contains':
      return leftStr.toLowerCase().includes(rightStr.toLowerCase());
    case 'exists':
      return left != null && left !== '';
    default:
      return false;
  }
}

function conditionsMatch(
  conditions: AutomationCondition[],
  context: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  const groups = new Map<number, AutomationCondition[]>();
  for (const c of conditions) {
    const list = groups.get(c.groupIndex) ?? [];
    list.push(c);
    groups.set(c.groupIndex, list);
  }
  // Groups are OR'd; conditions within a group are AND'd
  for (const group of groups.values()) {
    if (group.every((c) => evalCondition(c, context))) return true;
  }
  return false;
}

async function executeAction(
  sql: AppSql,
  accountId: string,
  action: AutomationAction,
  context: Record<string, unknown>
) {
  const conversationId = context.conversationId as string | undefined;
  const cfg = action.config;

  switch (action.actionType) {
    case 'add_label': {
      const labelId = cfg.labelId as string | undefined;
      if (!labelId || !conversationId) return;
      await sql`
        INSERT INTO conversation_labels (conversation_id, label_id)
        VALUES (${conversationId}::uuid, ${labelId}::uuid)
        ON CONFLICT DO NOTHING
      `;
      break;
    }
    case 'assign_agent': {
      const agentId = cfg.agentId as string | undefined;
      if (!agentId || !conversationId) return;
      await sql`
        UPDATE conversations SET assignee_id = ${agentId}::uuid, updated_at = NOW()
        WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
      `;
      break;
    }
    case 'assign_team': {
      const teamId = cfg.teamId as string | undefined;
      if (!teamId || !conversationId) return;
      await sql`
        UPDATE conversations SET team_id = ${teamId}::uuid, updated_at = NOW()
        WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
      `;
      break;
    }
    case 'change_status': {
      const status = cfg.status as string | undefined;
      if (!status || !conversationId) return;
      await sql`
        UPDATE conversations SET status = ${status}, updated_at = NOW()
        WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
      `;
      break;
    }
    case 'set_priority': {
      const priority = cfg.priority as string | undefined;
      if (!priority || !conversationId) return;
      await sql`
        UPDATE conversations SET priority = ${priority}, updated_at = NOW()
        WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
      `;
      break;
    }
    case 'add_private_note': {
      const content = (cfg.content as string | undefined)?.trim();
      if (!content || !conversationId) return;
      await sql`
        INSERT INTO messages (conversation_id, account_id, content, sender_type, is_private)
        VALUES (${conversationId}::uuid, ${accountId}::uuid, ${content}, 'system', true)
      `;
      break;
    }
    case 'fire_webhook': {
      const url = cfg.url as string | undefined;
      if (!url) return;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, trigger: context, action: action.actionType }),
      }).catch(() => undefined);
      break;
    }
    default:
      break;
  }
}

async function loadRuleParts(sql: AppSql, ruleId: string) {
  const conditions = await sql`
    SELECT id, group_index as "groupIndex", field, operator, value
    FROM automation_conditions WHERE rule_id = ${ruleId}::uuid
    ORDER BY group_index, id
  `;
  const actions = await sql`
    SELECT id, sort_order as "sortOrder", action_type as "actionType", config
    FROM automation_actions WHERE rule_id = ${ruleId}::uuid
    ORDER BY sort_order, id
  `;
  return {
    conditions: conditions as AutomationCondition[],
    actions: (actions as { id: string; sortOrder: number; actionType: string; config: Record<string, unknown> }[]).map(
      (a) => ({
        id: a.id,
        sortOrder: a.sortOrder,
        actionType: a.actionType,
        config: a.config ?? {},
      })
    ),
  };
}

export async function listAutomationRules(
  sql: AppSql,
  accountId: string
): Promise<AutomationRule[]> {
  const rules = await sql`
    SELECT id, account_id as "accountId", name, description,
           trigger_event as "triggerEvent", is_enabled as "isEnabled",
           sort_order as "sortOrder", created_by as "createdBy",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM automation_rules
    WHERE account_id = ${accountId}::uuid
    ORDER BY sort_order, created_at
  `;
  const result: AutomationRule[] = [];
  for (const r of rules as Omit<AutomationRule, 'conditions' | 'actions'>[]) {
    const parts = await loadRuleParts(sql, r.id);
    result.push({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
      ...parts,
    });
  }
  return result;
}

export async function getAutomationRule(
  sql: AppSql,
  accountId: string,
  ruleId: string
): Promise<AutomationRule | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, description,
           trigger_event as "triggerEvent", is_enabled as "isEnabled",
           sort_order as "sortOrder", created_by as "createdBy",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM automation_rules
    WHERE id = ${ruleId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const r = rows[0] as Omit<AutomationRule, 'conditions' | 'actions'> | undefined;
  if (!r) return null;
  const parts = await loadRuleParts(sql, r.id);
  return {
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
    ...parts,
  };
}

async function replaceRuleParts(
  sql: AppSql,
  ruleId: string,
  conditions: AutomationCondition[],
  actions: AutomationAction[]
) {
  await sql`DELETE FROM automation_conditions WHERE rule_id = ${ruleId}::uuid`;
  await sql`DELETE FROM automation_actions WHERE rule_id = ${ruleId}::uuid`;
  for (const c of conditions) {
    await sql`
      INSERT INTO automation_conditions (rule_id, group_index, field, operator, value)
      VALUES (
        ${ruleId}::uuid, ${c.groupIndex ?? 0}, ${c.field}, ${c.operator},
        ${JSON.stringify(c.value ?? null)}::jsonb
      )
    `;
  }
  for (const [i, a] of actions.entries()) {
    await sql`
      INSERT INTO automation_actions (rule_id, sort_order, action_type, config)
      VALUES (
        ${ruleId}::uuid, ${a.sortOrder ?? i}, ${a.actionType},
        ${JSON.stringify(a.config ?? {})}::jsonb
      )
    `;
  }
}

export async function createAutomationRule(
  sql: AppSql,
  accountId: string,
  userId: string | null,
  input: AutomationRuleInput
): Promise<AutomationRule> {
  const rows = await sql`
    INSERT INTO automation_rules (
      account_id, name, description, trigger_event, is_enabled, sort_order, created_by
    )
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.description ?? null},
      ${input.triggerEvent}, ${input.isEnabled ?? true}, ${input.sortOrder ?? 0},
      ${userId}::uuid
    )
    RETURNING id
  `;
  const id = (rows[0] as { id: string }).id;
  await replaceRuleParts(sql, id, input.conditions ?? [], input.actions ?? []);
  const rule = await getAutomationRule(sql, accountId, id);
  if (!rule) throw new Error('Failed to create rule');
  return rule;
}

export async function updateAutomationRule(
  sql: AppSql,
  accountId: string,
  ruleId: string,
  input: Partial<AutomationRuleInput>
): Promise<AutomationRule | null> {
  const existing = await getAutomationRule(sql, accountId, ruleId);
  if (!existing) return null;

  await sql`
    UPDATE automation_rules SET
      name = COALESCE(${input.name ?? null}, name),
      description = COALESCE(${input.description ?? null}, description),
      trigger_event = COALESCE(${input.triggerEvent ?? null}, trigger_event),
      is_enabled = COALESCE(${input.isEnabled ?? null}, is_enabled),
      sort_order = COALESCE(${input.sortOrder ?? null}, sort_order),
      updated_at = NOW()
    WHERE id = ${ruleId}::uuid AND account_id = ${accountId}::uuid
  `;

  if (input.conditions || input.actions) {
    await replaceRuleParts(
      sql,
      ruleId,
      input.conditions ?? existing.conditions,
      input.actions ?? existing.actions
    );
  }
  return getAutomationRule(sql, accountId, ruleId);
}

export async function deleteAutomationRule(
  sql: AppSql,
  accountId: string,
  ruleId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM automation_rules
    WHERE id = ${ruleId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Triggers include conversation.created, message.created, conversation.resolved,
 * contact.created (LeadMonitor/LeadSnapper synced contacts can wire this later).
 */
export async function runAutomationRules(
  sql: AppSql,
  accountId: string,
  triggerEvent: string,
  context: Record<string, unknown>
): Promise<{ matched: number; executed: number }> {
  const rules = await sql`
    SELECT id FROM automation_rules
    WHERE account_id = ${accountId}::uuid
      AND trigger_event = ${triggerEvent}
      AND is_enabled = true
    ORDER BY sort_order, created_at
  `;

  let matched = 0;
  let executed = 0;

  for (const r of rules as { id: string }[]) {
    const rule = await getAutomationRule(sql, accountId, r.id);
    if (!rule) continue;
    if (!conditionsMatch(rule.conditions, context)) continue;
    matched += 1;
    for (const action of rule.actions) {
      await executeAction(sql, accountId, action, context);
      executed += 1;
    }
  }

  return { matched, executed };
}
