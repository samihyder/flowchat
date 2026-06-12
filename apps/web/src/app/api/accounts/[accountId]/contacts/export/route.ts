import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { canExportContacts } from '@/lib/crm-permissions';
import { contactsToCsv } from '@/lib/csv-contacts';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const settings = await getAccountSettings(sql, accountId);
  if (!canExportContacts(settings, auth.userId, auth.role)) {
    return Response.json(
      { error: 'Contact export is disabled or you do not have permission' },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const type = url.searchParams.get('type');
  const pattern = q ? `%${q}%` : null;

  const rows = await sql`
    SELECT name, email, phone, type,
           created_at as "createdAt", last_activity_at as "lastActivityAt"
    FROM contacts c
    WHERE c.account_id = ${accountId}::uuid
      AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
      AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
    ORDER BY c.last_activity_at DESC NULLS LAST
    LIMIT 10000
  `;

  type Row = {
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
    createdAt: Date;
    lastActivityAt: Date | null;
  };
  const contacts = (rows as Row[]).map((r) => ({
    name: r.name,
    email: r.email,
    phone: r.phone,
    type: r.type,
    createdAt: new Date(r.createdAt).toISOString(),
    lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt).toISOString() : null,
  }));

  const csv = contactsToCsv(contacts);
  const filename = `flowchat-contacts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
