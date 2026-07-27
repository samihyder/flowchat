import type { AppSql } from '@/lib/db-sql';

export type DashboardApp = {
  id: string;
  accountId: string;
  name: string;
  embedUrl: string;
  isEnabled: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  accountId: string;
  name: string;
  embedUrl: string;
  isEnabled: boolean;
  createdAt: Date | string;
};

function serialize(row: Row): DashboardApp {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function listDashboardApps(
  sql: AppSql,
  accountId: string
): Promise<DashboardApp[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, embed_url as "embedUrl",
           is_enabled as "isEnabled", created_at as "createdAt"
    FROM dashboard_apps WHERE account_id = ${accountId}::uuid ORDER BY name
  `;
  return (rows as Row[]).map(serialize);
}

export async function createDashboardApp(
  sql: AppSql,
  accountId: string,
  input: { name: string; embedUrl: string; isEnabled?: boolean }
): Promise<DashboardApp> {
  const rows = await sql`
    INSERT INTO dashboard_apps (account_id, name, embed_url, is_enabled)
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.embedUrl}, ${input.isEnabled ?? true}
    )
    RETURNING id, account_id as "accountId", name, embed_url as "embedUrl",
              is_enabled as "isEnabled", created_at as "createdAt"
  `;
  return serialize(rows[0] as Row);
}

export async function updateDashboardApp(
  sql: AppSql,
  accountId: string,
  appId: string,
  input: Partial<{ name: string; embedUrl: string; isEnabled: boolean }>
): Promise<DashboardApp | null> {
  const rows = await sql`
    UPDATE dashboard_apps SET
      name = COALESCE(${input.name ?? null}, name),
      embed_url = COALESCE(${input.embedUrl ?? null}, embed_url),
      is_enabled = COALESCE(${input.isEnabled ?? null}, is_enabled)
    WHERE id = ${appId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, embed_url as "embedUrl",
              is_enabled as "isEnabled", created_at as "createdAt"
  `;
  const row = rows[0] as Row | undefined;
  return row ? serialize(row) : null;
}

export async function deleteDashboardApp(
  sql: AppSql,
  accountId: string,
  appId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM dashboard_apps
    WHERE id = ${appId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}
