import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { emitContactEvent, serializeContactRow } from '@/lib/contact-sync';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

const VALID_TYPES = ['visitor', 'lead', 'customer'] as const;

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const type = url.searchParams.get('type');
  const sort = url.searchParams.get('sort') ?? 'last_activity_at';
  const orderAsc = url.searchParams.get('order') === 'asc';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  if (type && !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return Response.json({ error: 'Invalid type filter' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const pattern = q ? `%${q}%` : null;

  let rows;
  if (sort === 'name') {
    rows = orderAsc
      ? await sql`
          SELECT c.id, c.name, c.email, c.phone, c.type,
                 c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
                 c.created_at as "createdAt", c.updated_at as "updatedAt",
                 COUNT(*) OVER()::int as "totalCount"
          FROM contacts c
          WHERE c.account_id = ${accountId}::uuid
            AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
            AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
          ORDER BY c.name ASC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT c.id, c.name, c.email, c.phone, c.type,
                 c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
                 c.created_at as "createdAt", c.updated_at as "updatedAt",
                 COUNT(*) OVER()::int as "totalCount"
          FROM contacts c
          WHERE c.account_id = ${accountId}::uuid
            AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
            AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
          ORDER BY c.name DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
  } else if (sort === 'created_at') {
    rows = orderAsc
      ? await sql`
          SELECT c.id, c.name, c.email, c.phone, c.type,
                 c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
                 c.created_at as "createdAt", c.updated_at as "updatedAt",
                 COUNT(*) OVER()::int as "totalCount"
          FROM contacts c
          WHERE c.account_id = ${accountId}::uuid
            AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
            AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
          ORDER BY c.created_at ASC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT c.id, c.name, c.email, c.phone, c.type,
                 c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
                 c.created_at as "createdAt", c.updated_at as "updatedAt",
                 COUNT(*) OVER()::int as "totalCount"
          FROM contacts c
          WHERE c.account_id = ${accountId}::uuid
            AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
            AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
          ORDER BY c.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
  } else {
    rows = orderAsc
      ? await sql`
          SELECT c.id, c.name, c.email, c.phone, c.type,
                 c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
                 c.created_at as "createdAt", c.updated_at as "updatedAt",
                 COUNT(*) OVER()::int as "totalCount"
          FROM contacts c
          WHERE c.account_id = ${accountId}::uuid
            AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
            AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
          ORDER BY c.last_activity_at ASC NULLS LAST
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT c.id, c.name, c.email, c.phone, c.type,
                 c.last_activity_at as "lastActivityAt", c.is_blocked as "isBlocked",
                 c.created_at as "createdAt", c.updated_at as "updatedAt",
                 COUNT(*) OVER()::int as "totalCount"
          FROM contacts c
          WHERE c.account_id = ${accountId}::uuid
            AND (${type ?? null}::text IS NULL OR c.type = ${type ?? null})
            AND (${pattern ?? null}::text IS NULL OR c.name ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern})
          ORDER BY c.last_activity_at DESC NULLS LAST
          LIMIT ${limit} OFFSET ${offset}
        `;
  }

  const total = (rows[0] as { totalCount?: number } | undefined)?.totalCount ?? 0;
  const contacts = rows.map((r) => {
    const row = r as Record<string, unknown> & { totalCount?: number };
    const { totalCount: _, ...contact } = row;
    return {
      ...contact,
      createdAt: new Date(contact.createdAt as Date | string).toISOString(),
      updatedAt: new Date(contact.updatedAt as Date | string).toISOString(),
      lastActivityAt: contact.lastActivityAt
        ? new Date(contact.lastActivityAt as Date | string).toISOString()
        : null,
    };
  });

  return Response.json({ contacts, total });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    labelIds?: string[];
  };

  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  const type = body.type?.trim() ?? 'lead';
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return Response.json({ error: 'Invalid contact type' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    INSERT INTO contacts (account_id, name, email, phone, type, last_activity_at)
    VALUES (
      ${accountId}::uuid,
      ${name},
      ${body.email?.trim() || null},
      ${body.phone?.trim() || null},
      ${type},
      NOW()
    )
    RETURNING id, name, email, phone, type, external_id as "externalId",
              last_activity_at as "lastActivityAt", is_blocked as "isBlocked",
              created_at as "createdAt", updated_at as "updatedAt"
  `;

  const contact = rows[0] as { id: string };
  if (rows[0]) {
    await emitContactEvent(
      sql,
      accountId,
      'contact.created',
      serializeContactRow(rows[0] as Record<string, unknown>)
    );
  }
  if (body.labelIds?.length && contact) {
    for (const labelId of body.labelIds) {
      await sql`
        INSERT INTO contact_labels (contact_id, label_id)
        SELECT ${contact.id}::uuid, ${labelId}::uuid
        WHERE EXISTS (SELECT 1 FROM labels WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid)
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return Response.json({ contact: rows[0] }, { status: 201 });
}
