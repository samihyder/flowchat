import type { AppSql } from '@/lib/db-sql';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';
import { triggerMarketingWorkflows } from '@/lib/marketing/workflow-triggers';
import { validateCustomAttributes, type CustomAttributeDefinition } from '@/lib/custom-attributes';
import {
  parseCsvRaw,
  type ColumnMapping,
  type CsvImportError,
} from '@/lib/csv-import-utils';

export type { ColumnMapping, CsvImportError } from '@/lib/csv-import-utils';
export { parseCsvRaw, importErrorsToCsv } from '@/lib/csv-import-utils';

export type ParsedImportRow = {
  name: string;
  email: string | null;
  phone: string | null;
  type: 'visitor' | 'lead' | 'customer';
  externalId: string | null;
  customAttributes: Record<string, unknown>;
};

const VALID_TYPES = ['visitor', 'lead', 'customer'] as const;

export function applyColumnMapping(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  attrDefinitions: CustomAttributeDefinition[]
): { parsed: ParsedImportRow[]; errors: CsvImportError[] } {
  const errors: CsvImportError[] = [];
  const parsed: ParsedImportRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i]!;
    const rowNum = i + 2;
    const map: Record<string, string> = {};
    headers.forEach((h, idx) => {
      map[h] = cells[idx] ?? '';
    });

    const get = (field?: string) => {
      if (!field) return '';
      return (map[field] ?? '').trim();
    };

    const firstName = get(mapping.firstName);
    const lastName = get(mapping.lastName);
    const fullName = get(mapping.name);
    const name =
      firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : fullName;

    if (!firstName && mapping.firstName) {
      errors.push({ row: rowNum, message: 'First Name is required' });
      continue;
    }
    if (!lastName && mapping.lastName) {
      errors.push({ row: rowNum, message: 'Last Name is required' });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: 'Name is required (map First Name + Last Name, or Name)' });
      continue;
    }

    const email = get(mapping.email ?? 'email') || null;
    if (!email) {
      errors.push({ row: rowNum, message: 'Email is required' });
      continue;
    }

    const t = get(mapping.type ?? 'type').toLowerCase();
    const type = VALID_TYPES.includes(t as (typeof VALID_TYPES)[number])
      ? (t as ParsedImportRow['type'])
      : 'lead';

    const customInput: Record<string, unknown> = {};
    for (const [attrKey, colName] of Object.entries(mapping.custom ?? {})) {
      const v = get(colName);
      if (v) customInput[attrKey] = v;
    }

    const { valid: customAttributes, errors: attrErrors } = validateCustomAttributes(
      attrDefinitions,
      customInput
    );
    for (const msg of attrErrors) {
      errors.push({ row: rowNum, message: msg });
    }

    parsed.push({
      name,
      email,
      phone: get(mapping.phone ?? 'phone') || null,
      type,
      externalId: get(mapping.externalId ?? 'external_id') || null,
      customAttributes,
    });
  }

  return { parsed, errors };
}

export async function processImportJobBatch(
  sql: AppSql,
  jobId: string,
  batchSize = 50
): Promise<{ done: boolean; job: Record<string, unknown> }> {
  const jobs = await sql`
    SELECT id, account_id as "accountId", status, csv_text as "csvText",
           column_mapping as "columnMapping", upsert_by_email as "upsertByEmail",
           total_rows as "totalRows", processed_rows as "processedRows",
           imported_count as "importedCount", skipped_count as "skippedCount",
           errors
    FROM contact_import_jobs
    WHERE id = ${jobId}::uuid
    LIMIT 1
  `;
  const job = jobs[0] as Record<string, unknown> | undefined;
  if (!job) throw new Error('Import job not found');
  if (job.status === 'completed' || job.status === 'failed') {
    return { done: true, job };
  }

  const accountId = job.accountId as string;
  const mapping = (job.columnMapping ?? {}) as ColumnMapping;
  const upsertByEmail = Boolean(job.upsertByEmail);
  let processedRows = Number(job.processedRows ?? 0);
  let importedCount = Number(job.importedCount ?? 0);
  let skippedCount = Number(job.skippedCount ?? 0);
  let errors = (job.errors ?? []) as CsvImportError[];

  if (job.status === 'pending') {
    await sql`
      UPDATE contact_import_jobs SET status = 'processing', updated_at = NOW()
      WHERE id = ${jobId}::uuid
    `;
  }

  const attrRows = await sql`
    SELECT key, label, attr_type as "attrType", options
    FROM custom_attribute_definitions
    WHERE account_id = ${accountId}::uuid AND entity_type = 'contact'
    ORDER BY sort_order ASC
  `;
  const attrDefinitions = (attrRows as Record<string, unknown>[]).map((r) => ({
    id: '',
    entityType: 'contact' as const,
    key: r.key as string,
    label: r.label as string,
    attrType: r.attrType as CustomAttributeDefinition['attrType'],
    options: (r.options as string[] | null) ?? null,
    sortOrder: 0,
  }));

  const { headers, rows } = parseCsvRaw(job.csvText as string);
  const { parsed } = applyColumnMapping(headers, rows, mapping, attrDefinitions);

  if (Number(job.totalRows) === 0) {
    await sql`
      UPDATE contact_import_jobs SET total_rows = ${parsed.length}, updated_at = NOW()
      WHERE id = ${jobId}::uuid
    `;
  }

  const batch = parsed.slice(processedRows, processedRows + batchSize);

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i]!;
    const rowNum = processedRows + i + 2;
    try {
      let existingId: string | null = null;
      if (row.externalId) {
        const byExt = await sql`
          SELECT id FROM contacts
          WHERE account_id = ${accountId}::uuid AND external_id = ${row.externalId}
          LIMIT 1
        `;
        existingId = (byExt[0] as { id: string } | undefined)?.id ?? null;
      }
      if (!existingId && row.email && upsertByEmail) {
        const byEmail = await sql`
          SELECT id FROM contacts
          WHERE account_id = ${accountId}::uuid AND email = ${row.email}
          LIMIT 1
        `;
        existingId = (byEmail[0] as { id: string } | undefined)?.id ?? null;
      }

      if (existingId) {
        const updated = await sql`
          UPDATE contacts SET
            name = ${row.name},
            email = COALESCE(${row.email}, email),
            phone = COALESCE(${row.phone}, phone),
            type = ${row.type},
            external_id = COALESCE(${row.externalId}, external_id),
            custom_attributes = COALESCE(custom_attributes, '{}'::jsonb) || ${JSON.stringify(row.customAttributes)}::jsonb,
            updated_at = NOW()
          WHERE id = ${existingId}::uuid
          RETURNING id, name, email, phone, type, external_id as "externalId",
                    last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
                    created_at as "createdAt", updated_at as "updatedAt"
        `;
        if (updated[0]) {
          await emitContactEvent(
            sql,
            accountId,
            'contact.updated',
            serializeContactRow(updated[0] as Record<string, unknown>)
          );
        }
        importedCount++;
      } else if (row.email) {
        const dup = await sql`
          SELECT id FROM contacts
          WHERE account_id = ${accountId}::uuid AND email = ${row.email}
          LIMIT 1
        `;
        if (dup[0]) {
          skippedCount++;
          errors.push({ row: rowNum, message: `Duplicate email: ${row.email}` });
          continue;
        }
      }

      if (!existingId) {
        const inserted = await sql`
          INSERT INTO contacts (account_id, name, email, phone, type, external_id, custom_attributes, last_activity_at)
          VALUES (
            ${accountId}::uuid,
            ${row.name},
            ${row.email},
            ${row.phone},
            ${row.type},
            ${row.externalId},
            ${JSON.stringify(row.customAttributes)}::jsonb,
            NOW()
          )
          RETURNING id, name, email, phone, type, external_id as "externalId",
                    last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
                    created_at as "createdAt", updated_at as "updatedAt"
        `;
        if (inserted[0]) {
          const contactId = (inserted[0] as { id: string }).id;
          await emitContactEvent(
            sql,
            accountId,
            'contact.created',
            serializeContactRow(inserted[0] as Record<string, unknown>)
          );
          if (row.email) {
            await triggerMarketingWorkflows(sql, accountId, 'contact_created', contactId);
          }
        }
        importedCount++;
      }
    } catch {
      skippedCount++;
      errors.push({ row: rowNum, message: 'Failed to import row' });
    }
  }

  processedRows += batch.length;
  const totalRows = parsed.length;
  const done = processedRows >= totalRows;

  await sql`
    UPDATE contact_import_jobs SET
      processed_rows = ${processedRows},
      imported_count = ${importedCount},
      skipped_count = ${skippedCount},
      errors = ${JSON.stringify(errors)}::jsonb,
      status = ${done ? 'completed' : 'processing'},
      completed_at = CASE WHEN ${done} THEN NOW() ELSE completed_at END,
      updated_at = NOW()
    WHERE id = ${jobId}::uuid
  `;

  return {
    done,
    job: {
      id: jobId,
      status: done ? 'completed' : 'processing',
      totalRows,
      processedRows,
      importedCount,
      skippedCount,
      errors,
    },
  };
}
