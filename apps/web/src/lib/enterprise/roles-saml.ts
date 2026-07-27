import type { AppSql } from '@/lib/db-sql';

export type CustomRole = {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SamlConfig = {
  accountId: string;
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  idpCertificate: string | null;
  spEntityId: string | null;
  roleAttribute: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoleRow = {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  permissions: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serializeRole(row: RoleRow): CustomRole {
  return {
    ...row,
    permissions: row.permissions ?? {},
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listCustomRoles(sql: AppSql, accountId: string): Promise<CustomRole[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, description, permissions,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM custom_roles WHERE account_id = ${accountId}::uuid ORDER BY name
  `;
  return (rows as RoleRow[]).map(serializeRole);
}

export async function getCustomRole(
  sql: AppSql,
  accountId: string,
  roleId: string
): Promise<CustomRole | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, description, permissions,
           created_at as "createdAt", updated_at as "updatedAt"
    FROM custom_roles
    WHERE id = ${roleId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as RoleRow | undefined;
  return row ? serializeRole(row) : null;
}

export async function createCustomRole(
  sql: AppSql,
  accountId: string,
  input: { name: string; description?: string | null; permissions?: Record<string, unknown> }
): Promise<CustomRole> {
  const rows = await sql`
    INSERT INTO custom_roles (account_id, name, description, permissions)
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.description ?? null},
      ${JSON.stringify(input.permissions ?? {})}::jsonb
    )
    RETURNING id, account_id as "accountId", name, description, permissions,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serializeRole(rows[0] as RoleRow);
}

export async function updateCustomRole(
  sql: AppSql,
  accountId: string,
  roleId: string,
  input: Partial<{ name: string; description: string | null; permissions: Record<string, unknown> }>
): Promise<CustomRole | null> {
  const rows = await sql`
    UPDATE custom_roles SET
      name = COALESCE(${input.name ?? null}, name),
      description = COALESCE(${input.description ?? null}, description),
      permissions = COALESCE(${input.permissions ? JSON.stringify(input.permissions) : null}::jsonb, permissions),
      updated_at = NOW()
    WHERE id = ${roleId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, description, permissions,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as RoleRow | undefined;
  return row ? serializeRole(row) : null;
}

export async function deleteCustomRole(
  sql: AppSql,
  accountId: string,
  roleId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM custom_roles
    WHERE id = ${roleId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getSamlConfig(
  sql: AppSql,
  accountId: string
): Promise<SamlConfig | null> {
  const rows = await sql`
    SELECT account_id as "accountId",
           idp_entity_id as "idpEntityId", idp_sso_url as "idpSsoUrl",
           idp_certificate as "idpCertificate", sp_entity_id as "spEntityId",
           role_attribute as "roleAttribute", is_enabled as "isEnabled",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM account_saml_configs WHERE account_id = ${accountId}::uuid LIMIT 1
  `;
  const row = rows[0] as
    | (Omit<SamlConfig, 'createdAt' | 'updatedAt'> & {
        createdAt: Date | string;
        updatedAt: Date | string;
      })
    | undefined;
  if (!row) return null;
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function upsertSamlConfig(
  sql: AppSql,
  accountId: string,
  input: Partial<{
    idpEntityId: string | null;
    idpSsoUrl: string | null;
    idpCertificate: string | null;
    spEntityId: string | null;
    roleAttribute: string | null;
    isEnabled: boolean;
  }>
): Promise<SamlConfig> {
  const rows = await sql`
    INSERT INTO account_saml_configs (
      account_id, idp_entity_id, idp_sso_url, idp_certificate,
      sp_entity_id, role_attribute, is_enabled
    )
    VALUES (
      ${accountId}::uuid,
      ${input.idpEntityId ?? null},
      ${input.idpSsoUrl ?? null},
      ${input.idpCertificate ?? null},
      ${input.spEntityId ?? null},
      ${input.roleAttribute ?? 'role'},
      ${input.isEnabled ?? false}
    )
    ON CONFLICT (account_id) DO UPDATE SET
      idp_entity_id = COALESCE(${input.idpEntityId ?? null}, account_saml_configs.idp_entity_id),
      idp_sso_url = COALESCE(${input.idpSsoUrl ?? null}, account_saml_configs.idp_sso_url),
      idp_certificate = COALESCE(${input.idpCertificate ?? null}, account_saml_configs.idp_certificate),
      sp_entity_id = COALESCE(${input.spEntityId ?? null}, account_saml_configs.sp_entity_id),
      role_attribute = COALESCE(${input.roleAttribute ?? null}, account_saml_configs.role_attribute),
      is_enabled = COALESCE(${input.isEnabled ?? null}, account_saml_configs.is_enabled),
      updated_at = NOW()
    RETURNING account_id as "accountId",
              idp_entity_id as "idpEntityId", idp_sso_url as "idpSsoUrl",
              idp_certificate as "idpCertificate", sp_entity_id as "spEntityId",
              role_attribute as "roleAttribute", is_enabled as "isEnabled",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as SamlConfig & { createdAt: Date | string; updatedAt: Date | string };
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
