import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';

type Params = { params: Promise<{ accountId: string; contactId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, contactId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content) return Response.json({ error: 'Content is required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!);
  const contact = await sql`
    SELECT id FROM contacts WHERE id = ${contactId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!contact[0]) return Response.json({ error: 'Contact not found' }, { status: 404 });

  const rows = await sql`
    INSERT INTO contact_notes (contact_id, account_id, author_id, content)
    VALUES (${contactId}::uuid, ${accountId}::uuid, ${auth.userId}::uuid, ${content})
    RETURNING id, content, created_at as "createdAt", updated_at as "updatedAt"
  `;

  return Response.json({ note: rows[0] }, { status: 201 });
}
