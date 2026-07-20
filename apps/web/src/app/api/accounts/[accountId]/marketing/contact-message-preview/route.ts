import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { resolveContactMessageDetail } from '@/lib/marketing/contact-message';
import type { ContactMessageMode } from '@/lib/marketing/campaign-step-draft';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

const MODES = new Set<ContactMessageMode>([
  'latest_note',
  'latest_inbound_chat',
  'latest_note_or_chat',
]);

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const contactId = url.searchParams.get('contactId');
  const mode = (url.searchParams.get('mode') ?? 'latest_note_or_chat') as ContactMessageMode;
  if (!contactId) {
    return Response.json({ error: 'contactId is required' }, { status: 400 });
  }
  if (!MODES.has(mode)) {
    return Response.json({ error: 'Invalid mode' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const detail = await resolveContactMessageDetail(sql, accountId, contactId, mode);
  return Response.json({
    text: detail.text,
    source: detail.source,
    previewAt: detail.at?.toISOString() ?? null,
  });
}
