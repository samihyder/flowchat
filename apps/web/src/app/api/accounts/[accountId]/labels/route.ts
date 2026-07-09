import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isValidLabelColor, normalizeLabelColor } from '@/lib/labels/colors';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT l.id, l.name, l.color, l.created_at as "createdAt",
           (SELECT COUNT(*)::int FROM conversation_labels cl WHERE cl.label_id = l.id) as "conversationCount"
    FROM labels l
    WHERE l.account_id = ${accountId}::uuid
    ORDER BY l.name ASC
  `;
  return Response.json({ labels: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  const color = normalizeLabelColor(body.color);
  if (body.color && !isValidLabelColor(color)) {
    return Response.json({ error: 'Invalid color' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    INSERT INTO labels (account_id, name, color)
    VALUES (${accountId}::uuid, ${name}, ${color})
    ON CONFLICT (account_id, name) DO UPDATE SET color = EXCLUDED.color
    RETURNING id, name, color
  `;
  return Response.json({ label: rows[0] }, { status: 201 });
}
