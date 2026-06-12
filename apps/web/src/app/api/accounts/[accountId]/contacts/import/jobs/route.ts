import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { canImportContacts } from '@/lib/crm-permissions';
import { parseCsvRaw, type ColumnMapping } from '@/lib/csv-import-utils';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const settings = await getAccountSettings(sql, accountId);
  if (!canImportContacts(settings, auth.userId, auth.role)) {
    return Response.json(
      { error: 'Contact import is disabled or you do not have permission' },
      { status: 403 }
    );
  }

  const contentType = req.headers.get('content-type') ?? '';
  let csvText = '';
  let columnMapping: ColumnMapping = {};
  let upsertByEmail = false;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'CSV file is required' }, { status: 400 });
    }
    csvText = await file.text();
    const mappingRaw = form.get('columnMapping');
    if (mappingRaw && typeof mappingRaw === 'string') {
      columnMapping = JSON.parse(mappingRaw) as ColumnMapping;
    }
    upsertByEmail = form.get('upsertByEmail') === 'true';
  } else {
    const body = (await req.json()) as {
      csv?: string;
      columnMapping?: ColumnMapping;
      upsertByEmail?: boolean;
    };
    csvText = body.csv ?? '';
    columnMapping = body.columnMapping ?? {};
    upsertByEmail = body.upsertByEmail ?? false;
  }

  if (!csvText.trim()) {
    return Response.json({ error: 'CSV content is empty' }, { status: 400 });
  }

  const { headers, rows } = parseCsvRaw(csvText);
  if (headers.length === 0 || rows.length === 0) {
    return Response.json({ error: 'CSV has no data rows' }, { status: 400 });
  }

  if (!columnMapping.name) {
    const lower = headers.map((h) => h.toLowerCase());
    columnMapping = {
      name: headers[lower.indexOf('name')] ?? headers[0],
      email: headers[lower.indexOf('email')] ?? undefined,
      phone: headers[lower.indexOf('phone')] ?? undefined,
      type: headers[lower.indexOf('type')] ?? undefined,
      externalId: headers[lower.indexOf('external_id')] ?? headers[lower.indexOf('externalid')] ?? undefined,
      ...columnMapping,
    };
  }

  const jobs = await sql`
    INSERT INTO contact_import_jobs (account_id, created_by, csv_text, column_mapping, upsert_by_email, total_rows)
    VALUES (
      ${accountId}::uuid,
      ${auth.userId}::uuid,
      ${csvText},
      ${JSON.stringify(columnMapping)}::jsonb,
      ${upsertByEmail},
      ${rows.length}
    )
    RETURNING id, status, total_rows as "totalRows", created_at as "createdAt"
  `;

  const job = jobs[0] as { id: string; status: string; totalRows: number; createdAt: Date };
  return Response.json(
    {
      job: {
        id: job.id,
        status: job.status,
        totalRows: job.totalRows,
        createdAt: new Date(job.createdAt).toISOString(),
      },
    },
    { status: 202 }
  );
}
