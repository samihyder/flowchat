import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { canImportContacts } from '@/lib/crm-permissions';
import { parseContactsCsv } from '@/lib/csv-contacts';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';
import { linkContactToGlobalCompany } from '@/lib/companies/resolve';
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

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'CSV file is required' }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    const body = (await req.json()) as { csv?: string };
    csvText = body.csv ?? '';
  }

  if (!csvText.trim()) {
    return Response.json({ error: 'CSV content is empty' }, { status: 400 });
  }

  const { rows, errors } = parseContactsCsv(csvText);
  if (errors.length > 0 && rows.length === 0) {
    return Response.json({ imported: 0, skipped: 0, errors }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const importErrors = [...errors];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      if (row.email) {
        const dup = await sql`
          SELECT id FROM contacts
          WHERE account_id = ${accountId}::uuid AND email = ${row.email}
          LIMIT 1
        `;
        if (dup[0]) {
          skipped++;
          importErrors.push({ row: i + 2, message: `Duplicate email: ${row.email}` });
          continue;
        }
      }

      const inserted = await sql`
        INSERT INTO contacts (account_id, name, email, phone, type, last_activity_at)
        VALUES (
          ${accountId}::uuid,
          ${row.name},
          ${row.email},
          ${row.phone},
          ${row.type},
          NOW()
        )
        RETURNING id, name, email, phone, type, external_id as "externalId",
                  last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
                  created_at as "createdAt", updated_at as "updatedAt"
      `;
      if (inserted[0]) {
        const row0 = inserted[0] as { id: string; email: string | null };
        await linkContactToGlobalCompany(sql, row0.id, row0.email, accountId);
        await emitContactEvent(
          sql,
          accountId,
          'contact.created',
          serializeContactRow(inserted[0] as Record<string, unknown>)
        );
      }
      imported++;
    } catch {
      skipped++;
      importErrors.push({ row: i + 2, message: 'Failed to insert row' });
    }
  }

  return Response.json({ imported, skipped, errors: importErrors });
}
