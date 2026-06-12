import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; definitionId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { accountId, definitionId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    DELETE FROM custom_attribute_definitions
    WHERE id = ${definitionId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  if (!result[0]) return Response.json({ error: 'Definition not found' }, { status: 404 });

  return Response.json({ ok: true });
}
