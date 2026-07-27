import { neon } from '@/lib/neon';
import type { AppSql } from '@/lib/db-sql';
import {
  ingestGenericChannelMessage,
  verifyApiChannelSignature,
} from '@/lib/channels/channel-configs';

type Params = { params: Promise<{ inboxId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const cfgRows = await sql`
    SELECT account_id as "accountId", secrets_encrypted as "secretsEncrypted", config
    FROM inbox_channel_configs WHERE inbox_id = ${inboxId}::uuid LIMIT 1
  `;
  const cfg = cfgRows[0] as
    | {
        accountId: string;
        secretsEncrypted: string | null;
        config: Record<string, unknown>;
      }
    | undefined;
  if (!cfg) return Response.json({ error: 'Not found' }, { status: 404 });

  if (!cfg.secretsEncrypted) {
    return Response.json(
      { error: 'Channel signing secret not configured for this inbox' },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || req.headers.get('x-hub-signature-256');
  if (!verifyApiChannelSignature(rawBody, signature, cfg.secretsEncrypted)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: {
    externalId?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    content?: string;
    message?: string;
    providerMessageId?: string;
    id?: string;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = (body.content || body.message || '').trim();
  if (!content) return Response.json({ error: 'content required' }, { status: 400 });

  try {
    const result = await ingestGenericChannelMessage(sql, cfg.accountId, inboxId, {
      externalId: body.externalId,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      content,
      providerMessageId: body.providerMessageId || body.id,
    });
    return Response.json(result, { status: result.deduped ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed';
    return Response.json({ error: message }, { status: 400 });
  }
}
