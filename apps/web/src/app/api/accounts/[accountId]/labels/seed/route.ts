import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { RECOMMENDED_LABELS } from '@/lib/labels/defaults';
import { normalizeLabelColor } from '@/lib/labels/colors';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  let created = 0;
  let updated = 0;

  for (const def of RECOMMENDED_LABELS) {
    const color = normalizeLabelColor(def.color);
    const existing = await sql`
      SELECT id, color FROM labels
      WHERE account_id = ${accountId}::uuid AND lower(name) = lower(${def.name})
      LIMIT 1
    `;

    if (existing.length) {
      if (existing[0]!.color !== color) {
        await sql`
          UPDATE labels SET color = ${color}
          WHERE id = ${existing[0]!.id}::uuid
        `;
        updated++;
      }
    } else {
      await sql`
        INSERT INTO labels (account_id, name, color)
        VALUES (${accountId}::uuid, ${def.name}, ${color})
      `;
      created++;
    }
  }

  const rows = await sql`
    SELECT id, name, color FROM labels
    WHERE account_id = ${accountId}::uuid
    ORDER BY name ASC
  `;

  return Response.json({
    ok: true,
    created,
    updated,
    skipped: RECOMMENDED_LABELS.length - created - updated,
    labels: rows,
  });
}
