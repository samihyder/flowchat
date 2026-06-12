import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { checkResendDomainStatus } from '@/lib/marketing/senders';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; senderId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, senderId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    label?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string | null;
    physicalAddress?: string | null;
    isDefault?: boolean;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const existing = await sql`
    SELECT id FROM marketing_senders WHERE id = ${senderId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!existing[0]) return Response.json({ error: 'Sender not found' }, { status: 404 });

  if (body.isDefault) {
    await sql`
      UPDATE marketing_senders SET is_default = false, updated_at = NOW()
      WHERE account_id = ${accountId}::uuid
    `;
  }

  const fromEmail = body.fromEmail?.trim();
  const domainStatus = fromEmail ? await checkResendDomainStatus(fromEmail) : undefined;

  const rows = await sql`
    UPDATE marketing_senders SET
      label = COALESCE(${body.label?.trim() ?? null}, label),
      from_name = COALESCE(${body.fromName?.trim() ?? null}, from_name),
      from_email = COALESCE(${fromEmail ?? null}, from_email),
      reply_to = COALESCE(${body.replyTo ?? null}, reply_to),
      physical_address = COALESCE(${body.physicalAddress ?? null}, physical_address),
      is_default = COALESCE(${body.isDefault ?? null}, is_default),
      domain_status = COALESCE(${domainStatus ?? null}, domain_status),
      updated_at = NOW()
    WHERE id = ${senderId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, label, from_name as "fromName", from_email as "fromEmail",
              reply_to as "replyTo", physical_address as "physicalAddress",
              is_default as "isDefault", domain_status as "domainStatus"
  `;

  return Response.json({ sender: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, senderId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    DELETE FROM marketing_senders
    WHERE id = ${senderId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, is_default as "isDefault"
  `;
  if (!rows[0]) return Response.json({ error: 'Sender not found' }, { status: 404 });

  if ((rows[0] as { isDefault: boolean }).isDefault) {
    await sql`
      UPDATE marketing_senders SET is_default = true, updated_at = NOW()
      WHERE account_id = ${accountId}::uuid
        AND id = (
          SELECT id FROM marketing_senders WHERE account_id = ${accountId}::uuid
          ORDER BY created_at ASC LIMIT 1
        )
    `;
  }

  return Response.json({ ok: true });
}
