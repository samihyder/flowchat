import { neon } from '@/lib/neon';
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
  const labelId = url.searchParams.get('labelId');
  const pattern = q ? `%${q}%` : null;
  const idsParam = url.searchParams.get('ids');
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : null;

  const attrDefs = await sql`
    SELECT key FROM custom_attribute_definitions
    WHERE account_id = ${accountId}::uuid AND entity_type = 'contact'
    ORDER BY sort_order ASC
  `;
  const attrKeys = (attrDefs as { key: string }[]).map((d) => d.key);

  const rows = await sql`
    SELECT c.name, c.email, c.phone, c.type, c.external_id as "externalId",
           c.custom_attributes as "customAttributes",
           c.created_at as "createdAt", c.last_activity_at as "lastActivityAt",
           COALESCE(
             (SELECT string_agg(l.name, '; ' ORDER BY l.name)
              FROM contact_labels cl INNER JOIN labels l ON l.id = cl.label_id
              WHERE cl.contact_id = c.id),
             ''
           ) as labels
    FROM contacts c
    WHERE c.account_id = ${accountId}::uuid
      AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
      AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern} OR c.external_id ILIKE ${pattern})
      AND (${labelId ?? null}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM contact_labels cl WHERE cl.contact_id = c.id AND cl.label_id = ${labelId}::uuid
      ))
      AND (${ids}::uuid[] IS NULL OR c.id = ANY(${ids}::uuid[]))
    ORDER BY c.last_activity_at DESC NULLS LAST
    LIMIT 10000
  `;

  type Row = {
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
    externalId: string | null;
    customAttributes: Record<string, unknown> | null;
    labels: string;
    createdAt: Date;
    lastActivityAt: Date | null;
  };

  const csv = contactsToCsv(
    (rows as Row[]).map((r) => ({
      name: r.name,
      email: r.email,
      phone: r.phone,
      type: r.type,
      externalId: r.externalId,
      labels: r.labels,
      customAttributes: r.customAttributes ?? {},
      createdAt: new Date(r.createdAt).toISOString(),
      lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt).toISOString() : null,
    })),
    attrKeys
  );

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="flowchat-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
