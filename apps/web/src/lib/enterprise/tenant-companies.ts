import type { AppSql } from '@/lib/db-sql';

export type TenantCompany = {
  id: string;
  accountId: string;
  name: string;
  domain: string | null;
  description: string | null;
  customAttributes: Record<string, unknown>;
  globalCompanyId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  accountId: string;
  name: string;
  domain: string | null;
  description: string | null;
  customAttributes: Record<string, unknown>;
  globalCompanyId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serialize(row: Row): TenantCompany {
  return {
    ...row,
    customAttributes: row.customAttributes ?? {},
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listTenantCompanies(
  sql: AppSql,
  accountId: string
): Promise<TenantCompany[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, domain, description,
           custom_attributes as "customAttributes",
           global_company_id as "globalCompanyId",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM tenant_companies WHERE account_id = ${accountId}::uuid ORDER BY name
  `;
  return (rows as Row[]).map(serialize);
}

export async function getTenantCompany(
  sql: AppSql,
  accountId: string,
  companyId: string
): Promise<TenantCompany | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, domain, description,
           custom_attributes as "customAttributes",
           global_company_id as "globalCompanyId",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM tenant_companies
    WHERE id = ${companyId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as Row | undefined;
  return row ? serialize(row) : null;
}

export async function createTenantCompany(
  sql: AppSql,
  accountId: string,
  input: {
    name: string;
    domain?: string | null;
    description?: string | null;
    customAttributes?: Record<string, unknown>;
    globalCompanyId?: string | null;
  }
): Promise<TenantCompany> {
  const rows = await sql`
    INSERT INTO tenant_companies (
      account_id, name, domain, description, custom_attributes, global_company_id
    )
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.domain ?? null},
      ${input.description ?? null},
      ${JSON.stringify(input.customAttributes ?? {})}::jsonb,
      ${input.globalCompanyId ?? null}::uuid
    )
    RETURNING id, account_id as "accountId", name, domain, description,
              custom_attributes as "customAttributes",
              global_company_id as "globalCompanyId",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serialize(rows[0] as Row);
}

export async function updateTenantCompany(
  sql: AppSql,
  accountId: string,
  companyId: string,
  input: Partial<{
    name: string;
    domain: string | null;
    description: string | null;
    customAttributes: Record<string, unknown>;
    globalCompanyId: string | null;
  }>
): Promise<TenantCompany | null> {
  const rows = await sql`
    UPDATE tenant_companies SET
      name = COALESCE(${input.name ?? null}, name),
      domain = COALESCE(${input.domain ?? null}, domain),
      description = COALESCE(${input.description ?? null}, description),
      custom_attributes = COALESCE(
        ${input.customAttributes ? JSON.stringify(input.customAttributes) : null}::jsonb,
        custom_attributes
      ),
      global_company_id = COALESCE(${input.globalCompanyId ?? null}::uuid, global_company_id),
      updated_at = NOW()
    WHERE id = ${companyId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, domain, description,
              custom_attributes as "customAttributes",
              global_company_id as "globalCompanyId",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as Row | undefined;
  return row ? serialize(row) : null;
}

export async function deleteTenantCompany(
  sql: AppSql,
  accountId: string,
  companyId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM tenant_companies
    WHERE id = ${companyId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}
