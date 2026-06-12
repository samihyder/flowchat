import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAttachmentUploadUrl, r2Configured } from '@/lib/storage';

type Params = { params: Promise<{ accountId: string; conversationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId, conversationId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  if (!r2Configured) {
    return Response.json({ error: 'File storage is not configured' }, { status: 503 });
  }

  const body = (await req.json()) as { filename?: string; contentType?: string; sizeBytes?: number };
  if (!body.filename || !body.contentType) {
    return Response.json({ error: 'filename and contentType are required' }, { status: 400 });
  }
  if ((body.sizeBytes ?? 0) > 15 * 1024 * 1024) {
    return Response.json({ error: 'Max file size is 15 MB' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const conv = await sql`
    SELECT id FROM conversations
    WHERE id = ${conversationId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  if (!conv[0]) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const key = `attachments/${accountId}/${conversationId}/${crypto.randomUUID()}-${safeName}`;
  const { uploadUrl, publicUrl } = await getAttachmentUploadUrl(key, body.contentType);

  return Response.json({ uploadUrl, publicUrl, storageKey: key });
}
