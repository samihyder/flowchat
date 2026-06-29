import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { checkSenderDomainStatus } from '@/lib/marketing/senders';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

function serializeSender(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    label: row.label as string,
    fromName: row.fromName as string,
    fromEmail: row.fromEmail as string,
    replyTo: (row.replyTo as string | null) ?? null,
    physicalAddress: (row.physicalAddress as string | null) ?? null,
    isDefault: Boolean(row.isDefault),
    domainStatus: row.domainStatus as string,
    credentialId: (row.credentialId as string | null) ?? null,
    createdAt: new Date(row.createdAt as Date).toISOString(),
    updatedAt: new Date(row.updatedAt as Date).toISOString(),
  };
}

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT id, label, from_name as "fromName", from_email as "fromEmail",
           reply_to as "replyTo", physical_address as "physicalAddress",
           is_default as "isDefault", domain_status as "domainStatus",
           credential_id as "credentialId",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM marketing_senders
    WHERE account_id = ${accountId}::uuid
    ORDER BY is_default DESC, label ASC
  `;

  const senders = await Promise.all(
    (rows as Record<string, unknown>[]).map(async (row) => {
      const liveStatus = await checkSenderDomainStatus(
        sql,
        accountId,
        row.fromEmail as string,
        (row.credentialId as string | null) ?? null
      );
      if (liveStatus !== row.domainStatus) {
        await sql`
          UPDATE marketing_senders
          SET domain_status = ${liveStatus}, updated_at = NOW()
          WHERE id = ${row.id as string}::uuid
        `;
      }
      return serializeSender({ ...row, domainStatus: liveStatus });
    })
  );

  return Response.json({ senders });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    label?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    physicalAddress?: string;
    isDefault?: boolean;
    credentialId?: string | null;
  };
  if (!body.label?.trim() || !body.fromName?.trim() || !body.fromEmail?.trim()) {
    return Response.json({ error: 'Label, from name, and from email are required' }, { status: 400 });
  }

  const domainStatus = await checkSenderDomainStatus(
    neon(process.env.DATABASE_URL!) as AppSql,
    accountId,
    body.fromEmail.trim(),
    body.credentialId
  );
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (body.isDefault) {
    await sql`
      UPDATE marketing_senders SET is_default = false, updated_at = NOW()
      WHERE account_id = ${accountId}::uuid
    `;
  }

  const existing = await sql`
    SELECT COUNT(*)::int as count FROM marketing_senders WHERE account_id = ${accountId}::uuid
  `;
  const isFirst = ((existing[0] as { count: number }).count ?? 0) === 0;
  const makeDefault = body.isDefault ?? isFirst;

  const rows = await sql`
    INSERT INTO marketing_senders (
      account_id, label, from_name, from_email, reply_to, physical_address, is_default, domain_status, credential_id
    ) VALUES (
      ${accountId}::uuid,
      ${body.label.trim()},
      ${body.fromName.trim()},
      ${body.fromEmail.trim()},
      ${body.replyTo?.trim() ?? null},
      ${body.physicalAddress?.trim() ?? null},
      ${makeDefault},
      ${domainStatus},
      ${body.credentialId ?? null}::uuid
    )
    RETURNING id, label, from_name as "fromName", from_email as "fromEmail",
              reply_to as "replyTo", physical_address as "physicalAddress",
              is_default as "isDefault", domain_status as "domainStatus",
              credential_id as "credentialId",
              created_at as "createdAt", updated_at as "updatedAt"
  `;

  return Response.json({ sender: serializeSender(rows[0] as Record<string, unknown>) }, { status: 201 });
}
