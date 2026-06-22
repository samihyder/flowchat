import type { AppSql } from '@/lib/db-sql';
import { decryptSecret, encryptSecret, secretPrefix } from '@/lib/credentials/encryption';
import type {
  CredentialStatus,
  ServiceCategory,
  ServiceCredentialRow,
  ServiceProviderId,
} from '@/lib/credentials/types';

type DbRow = {
  id: string;
  accountId: string;
  category: ServiceCategory;
  provider: ServiceProviderId;
  label: string;
  secretPrefix: string;
  secretCiphertext: string;
  secretIv: string;
  secretTag: string;
  config: Record<string, unknown>;
  status: CredentialStatus;
  isDefault: boolean;
  lastVerifiedAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(row: DbRow): ServiceCredentialRow {
  return {
    id: row.id,
    accountId: row.accountId,
    category: row.category,
    provider: row.provider,
    label: row.label,
    secretPrefix: row.secretPrefix,
    config: row.config ?? {},
    status: row.status,
    isDefault: row.isDefault,
    lastVerifiedAt: row.lastVerifiedAt ? new Date(row.lastVerifiedAt).toISOString() : null,
    lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null,
    usageCount: Number(row.usageCount) || 0,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listCredentials(
  sql: AppSql,
  accountId: string,
  category?: ServiceCategory
): Promise<ServiceCredentialRow[]> {
  const rows = category
    ? await sql`
        SELECT id, account_id as "accountId", category, provider, label,
               secret_prefix as "secretPrefix",
               secret_ciphertext as "secretCiphertext", secret_iv as "secretIv", secret_tag as "secretTag",
               config_json as config, status, is_default as "isDefault",
               last_verified_at as "lastVerifiedAt", last_used_at as "lastUsedAt",
               usage_count as "usageCount", created_at as "createdAt", updated_at as "updatedAt"
        FROM account_service_credentials
        WHERE account_id = ${accountId}::uuid AND category = ${category}
        ORDER BY is_default DESC, label ASC
      `
    : await sql`
        SELECT id, account_id as "accountId", category, provider, label,
               secret_prefix as "secretPrefix",
               secret_ciphertext as "secretCiphertext", secret_iv as "secretIv", secret_tag as "secretTag",
               config_json as config, status, is_default as "isDefault",
               last_verified_at as "lastVerifiedAt", last_used_at as "lastUsedAt",
               usage_count as "usageCount", created_at as "createdAt", updated_at as "updatedAt"
        FROM account_service_credentials
        WHERE account_id = ${accountId}::uuid
        ORDER BY category, is_default DESC, label ASC
      `;

  return (rows as DbRow[]).map((r) => serialize(r));
}

export async function getCredentialSecret(
  sql: AppSql,
  accountId: string,
  credentialId: string
): Promise<{ row: ServiceCredentialRow; secret: string } | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", category, provider, label,
           secret_prefix as "secretPrefix",
           secret_ciphertext as "secretCiphertext", secret_iv as "secretIv", secret_tag as "secretTag",
           config_json as config, status, is_default as "isDefault",
           last_verified_at as "lastVerifiedAt", last_used_at as "lastUsedAt",
           usage_count as "usageCount", created_at as "createdAt", updated_at as "updatedAt"
    FROM account_service_credentials
    WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid AND status = 'active'
    LIMIT 1
  `;
  const r = rows[0] as DbRow | undefined;
  if (!r) return null;

  const secret = decryptSecret({
    ciphertext: r.secretCiphertext,
    iv: r.secretIv,
    tag: r.secretTag,
  });

  return {
    row: serialize(r),
    secret,
  };
}

export async function resolveEmailCredential(
  sql: AppSql,
  accountId: string,
  credentialId?: string | null
): Promise<{ row: ServiceCredentialRow; secret: string } | null> {
  if (credentialId) {
    return getCredentialSecret(sql, accountId, credentialId);
  }

  const rows = await sql`
    SELECT id, account_id as "accountId", category, provider, label,
           secret_prefix as "secretPrefix",
           secret_ciphertext as "secretCiphertext", secret_iv as "secretIv", secret_tag as "secretTag",
           config_json as config, status, is_default as "isDefault",
           last_verified_at as "lastVerifiedAt", last_used_at as "lastUsedAt",
           usage_count as "usageCount", created_at as "createdAt", updated_at as "updatedAt"
    FROM account_service_credentials
    WHERE account_id = ${accountId}::uuid
      AND category = 'email_marketing'
      AND status = 'active'
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `;
  const r = rows[0] as DbRow | undefined;
  if (!r) return null;

  return {
    row: serialize(r),
    secret: decryptSecret({
      ciphertext: r.secretCiphertext,
      iv: r.secretIv,
      tag: r.secretTag,
    }),
  };
}

export async function createCredential(
  sql: AppSql,
  input: {
    accountId: string;
    category: ServiceCategory;
    provider: ServiceProviderId;
    label: string;
    secret: string;
    config?: Record<string, unknown>;
    isDefault?: boolean;
    createdBy?: string;
  }
): Promise<ServiceCredentialRow> {
  const enc = encryptSecret(input.secret);
  const prefix = secretPrefix(input.secret);

  if (input.isDefault) {
    await sql`
      UPDATE account_service_credentials SET is_default = false, updated_at = NOW()
      WHERE account_id = ${input.accountId}::uuid AND category = ${input.category}
    `;
  }

  const existing = await sql`
    SELECT COUNT(*)::int as c FROM account_service_credentials
    WHERE account_id = ${input.accountId}::uuid AND category = ${input.category}
  `;
  const isFirst = ((existing[0] as { c: number }).c ?? 0) === 0;

  const rows = await sql`
    INSERT INTO account_service_credentials (
      account_id, category, provider, label,
      secret_ciphertext, secret_iv, secret_tag, secret_prefix,
      config_json, is_default, created_by, last_verified_at
    ) VALUES (
      ${input.accountId}::uuid,
      ${input.category},
      ${input.provider},
      ${input.label.trim()},
      ${enc.ciphertext},
      ${enc.iv},
      ${enc.tag},
      ${prefix},
      ${JSON.stringify(input.config ?? {})}::jsonb,
      ${input.isDefault ?? isFirst},
      ${input.createdBy ?? null}::uuid,
      NOW()
    )
    RETURNING id, account_id as "accountId", category, provider, label,
              secret_prefix as "secretPrefix",
              secret_ciphertext as "secretCiphertext", secret_iv as "secretIv", secret_tag as "secretTag",
              config_json as config, status, is_default as "isDefault",
              last_verified_at as "lastVerifiedAt", last_used_at as "lastUsedAt",
              usage_count as "usageCount", created_at as "createdAt", updated_at as "updatedAt"
  `;

  return serialize(rows[0] as DbRow);
}

export async function markCredentialUsed(sql: AppSql, credentialId: string) {
  await sql`
    UPDATE account_service_credentials
    SET last_used_at = NOW(), usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${credentialId}::uuid
  `;
}

export async function setCredentialStatus(
  sql: AppSql,
  accountId: string,
  credentialId: string,
  status: CredentialStatus
) {
  await sql`
    UPDATE account_service_credentials
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid
  `;
}

export async function deleteCredential(sql: AppSql, accountId: string, credentialId: string) {
  await sql`
    DELETE FROM account_service_credentials
    WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid
  `;
}

export async function updateCredential(
  sql: AppSql,
  accountId: string,
  credentialId: string,
  patch: { label?: string; isDefault?: boolean; config?: Record<string, unknown> }
) {
  if (patch.isDefault) {
    const row = await sql`
      SELECT category FROM account_service_credentials
      WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
    `;
    const category = (row[0] as { category: ServiceCategory } | undefined)?.category;
    if (category) {
      await sql`
        UPDATE account_service_credentials SET is_default = false, updated_at = NOW()
        WHERE account_id = ${accountId}::uuid AND category = ${category}
      `;
    }
  }

  if (patch.label) {
    await sql`
      UPDATE account_service_credentials SET label = ${patch.label.trim()}, updated_at = NOW()
      WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid
    `;
  }
  if (patch.isDefault !== undefined) {
    await sql`
      UPDATE account_service_credentials SET is_default = ${patch.isDefault}, updated_at = NOW()
      WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid
    `;
  }
  if (patch.config) {
    await sql`
      UPDATE account_service_credentials
      SET config_json = ${JSON.stringify(patch.config)}::jsonb, updated_at = NOW()
      WHERE id = ${credentialId}::uuid AND account_id = ${accountId}::uuid
    `;
  }
}
