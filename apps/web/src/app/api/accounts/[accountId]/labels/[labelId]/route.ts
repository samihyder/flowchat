import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isValidLabelColor, normalizeLabelColor } from '@/lib/labels/colors';

type Params = { params: Promise<{ accountId: string; labelId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { accountId, labelId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  const color = body.color !== undefined ? normalizeLabelColor(body.color) : undefined;

  if (name !== undefined && !name) {
    return Response.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (color !== undefined && !isValidLabelColor(color)) {
    return Response.json({ error: 'Invalid color' }, { status: 400 });
  }
  if (name === undefined && color === undefined) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  const existing = await sql`
    SELECT id FROM labels
    WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid
    LIMIT 1
  `;
  if (!existing.length) return Response.json({ error: 'Label not found' }, { status: 404 });

  if (name) {
    const clash = await sql`
      SELECT id FROM labels
      WHERE account_id = ${accountId}::uuid
        AND lower(name) = lower(${name})
        AND id <> ${labelId}::uuid
      LIMIT 1
    `;
    if (clash.length) {
      return Response.json({ error: 'A label with this name already exists' }, { status: 409 });
    }
  }

  const rows = await sql`
    UPDATE labels
    SET
      name = COALESCE(${name ?? null}, name),
      color = COALESCE(${color ?? null}, color)
    WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, name, color
  `;

  return Response.json({ label: rows[0] });
}

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, labelId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    DELETE FROM labels
    WHERE id = ${labelId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;

  if (!rows.length) return Response.json({ error: 'Label not found' }, { status: 404 });
  return Response.json({ ok: true });
}
