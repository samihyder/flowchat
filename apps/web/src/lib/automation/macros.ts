import type { AppSql } from '@/lib/db-sql';

export type Macro = {
  id: string;
  accountId: string;
  name: string;
  visibility: string;
  ownerUserId: string | null;
  actions: { actionType: string; config: Record<string, unknown> }[];
  createdAt: string;
  updatedAt: string;
};

export type MacroInput = {
  name: string;
  visibility?: string;
  ownerUserId?: string | null;
  actions?: { actionType: string; config: Record<string, unknown> }[];
};

type MacroRow = {
  id: string;
  accountId: string;
  name: string;
  visibility: string;
  ownerUserId: string | null;
  actions: { actionType: string; config: Record<string, unknown> }[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: MacroRow): Macro {
  return {
    id: row.id,
    accountId: row.accountId,
    name: row.name,
    visibility: row.visibility,
    ownerUserId: row.ownerUserId,
    actions: Array.isArray(row.actions) ? row.actions : [],
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listMacros(sql: AppSql, accountId: string, userId?: string): Promise<Macro[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, visibility,
           owner_user_id as "ownerUserId", actions,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM macros
    WHERE account_id = ${accountId}::uuid
      AND (
        visibility = 'global'
        OR owner_user_id = ${userId ?? null}::uuid
        OR ${userId ?? null}::uuid IS NULL
      )
    ORDER BY name
  `;
  return (rows as MacroRow[]).map(serialize);
}

export async function getMacro(
  sql: AppSql,
  accountId: string,
  macroId: string
): Promise<Macro | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, visibility,
           owner_user_id as "ownerUserId", actions,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM macros
    WHERE id = ${macroId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as MacroRow | undefined;
  return row ? serialize(row) : null;
}

export async function createMacro(
  sql: AppSql,
  accountId: string,
  input: MacroInput
): Promise<Macro> {
  const rows = await sql`
    INSERT INTO macros (account_id, name, visibility, owner_user_id, actions)
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.visibility ?? 'global'},
      ${input.ownerUserId ?? null}::uuid,
      ${JSON.stringify(input.actions ?? [])}::jsonb
    )
    RETURNING id, account_id as "accountId", name, visibility,
              owner_user_id as "ownerUserId", actions,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serialize(rows[0] as MacroRow);
}

export async function updateMacro(
  sql: AppSql,
  accountId: string,
  macroId: string,
  input: Partial<MacroInput>
): Promise<Macro | null> {
  const rows = await sql`
    UPDATE macros SET
      name = COALESCE(${input.name ?? null}, name),
      visibility = COALESCE(${input.visibility ?? null}, visibility),
      owner_user_id = COALESCE(${input.ownerUserId ?? null}::uuid, owner_user_id),
      actions = COALESCE(${input.actions ? JSON.stringify(input.actions) : null}::jsonb, actions),
      updated_at = NOW()
    WHERE id = ${macroId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, visibility,
              owner_user_id as "ownerUserId", actions,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as MacroRow | undefined;
  return row ? serialize(row) : null;
}

export async function deleteMacro(
  sql: AppSql,
  accountId: string,
  macroId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM macros
    WHERE id = ${macroId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function runMacro(
  sql: AppSql,
  accountId: string,
  conversationId: string,
  macroId: string,
  userId: string
): Promise<{ ok: boolean; executed: number; error?: string }> {
  const macro = await getMacro(sql, accountId, macroId);
  if (!macro) return { ok: false, executed: 0, error: 'Macro not found' };
  if (
    macro.visibility === 'personal' &&
    macro.ownerUserId != null &&
    macro.ownerUserId !== userId
  ) {
    return { ok: false, executed: 0, error: 'Macro not found' };
  }

  const conv = await sql`
    SELECT id FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!conv[0]) return { ok: false, executed: 0, error: 'Conversation not found' };

  let executed = 0;
  for (const action of macro.actions) {
    const cfg = action.config;
    switch (action.actionType) {
      case 'add_label': {
        const labelId = cfg.labelId as string | undefined;
        if (labelId) {
          await sql`
            INSERT INTO conversation_labels (conversation_id, label_id)
            VALUES (${conversationId}::uuid, ${labelId}::uuid)
            ON CONFLICT DO NOTHING
          `;
          executed += 1;
        }
        break;
      }
      case 'assign_agent': {
        const agentId = (cfg.agentId as string | undefined) ?? userId;
        await sql`
          UPDATE conversations SET assignee_id = ${agentId}::uuid, updated_at = NOW()
          WHERE id = ${conversationId}::uuid
        `;
        executed += 1;
        break;
      }
      case 'assign_team': {
        const teamId = cfg.teamId as string | undefined;
        if (teamId) {
          await sql`
            UPDATE conversations SET team_id = ${teamId}::uuid, updated_at = NOW()
            WHERE id = ${conversationId}::uuid
          `;
          executed += 1;
        }
        break;
      }
      case 'change_status': {
        const status = cfg.status as string | undefined;
        if (status) {
          await sql`
            UPDATE conversations SET status = ${status}, updated_at = NOW()
            WHERE id = ${conversationId}::uuid
          `;
          executed += 1;
        }
        break;
      }
      case 'set_priority': {
        const priority = cfg.priority as string | undefined;
        if (priority) {
          await sql`
            UPDATE conversations SET priority = ${priority}, updated_at = NOW()
            WHERE id = ${conversationId}::uuid
          `;
          executed += 1;
        }
        break;
      }
      case 'add_private_note': {
        const content = (cfg.content as string | undefined)?.trim();
        if (content) {
          await sql`
            INSERT INTO messages (conversation_id, account_id, content, sender_type, sender_id, is_private)
            VALUES (${conversationId}::uuid, ${accountId}::uuid, ${content}, 'agent', ${userId}::uuid, true)
          `;
          executed += 1;
        }
        break;
      }
      case 'send_message': {
        const content = (cfg.content as string | undefined)?.trim();
        if (content) {
          await sql`
            INSERT INTO messages (conversation_id, account_id, content, sender_type, sender_id)
            VALUES (${conversationId}::uuid, ${accountId}::uuid, ${content}, 'agent', ${userId}::uuid)
          `;
          executed += 1;
        }
        break;
      }
      default:
        break;
    }
  }

  return { ok: true, executed };
}
