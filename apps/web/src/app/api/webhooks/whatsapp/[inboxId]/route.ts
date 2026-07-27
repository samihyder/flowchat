import { neon } from '@/lib/neon';
import type { AppSql } from '@/lib/db-sql';
import {
  ingestWhatsAppWebhook,
  verifyWhatsAppSignature,
  verifyWhatsAppWebhook,
} from '@/lib/channels/whatsapp-cloud';
import { unpackEncryptedSecret } from '@/lib/credentials/encryption';

type Params = { params: Promise<{ inboxId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    SELECT verify_token as "verifyToken"
    FROM inbox_whatsapp_configs WHERE inbox_id = ${inboxId}::uuid LIMIT 1
  `;
  const cfg = rows[0] as { verifyToken: string } | undefined;
  if (!cfg) return new Response('Not found', { status: 404 });

  const verified = verifyWhatsAppWebhook(mode, token, challenge, cfg.verifyToken);
  if (verified == null) return new Response('Forbidden', { status: 403 });
  return new Response(verified, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(req: Request, { params }: Params) {
  const { inboxId } = await params;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  const cfgRows = await sql`
    SELECT app_secret_encrypted as "appSecretEncrypted"
    FROM inbox_whatsapp_configs WHERE inbox_id = ${inboxId}::uuid LIMIT 1
  `;
  const cfg = cfgRows[0] as { appSecretEncrypted: string | null } | undefined;
  if (!cfg) return Response.json({ error: 'Not found' }, { status: 404 });

  const appSecret = unpackEncryptedSecret(cfg.appSecretEncrypted);
  if (!appSecret) {
    return Response.json(
      { error: 'WhatsApp app secret not configured for this inbox' },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Parameters<typeof ingestWhatsAppWebhook>[1];
  try {
    body = JSON.parse(rawBody) as Parameters<typeof ingestWhatsAppWebhook>[1];
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = await ingestWhatsAppWebhook(sql, body, { expectedInboxId: inboxId });
  return Response.json({ ok: true, ...result });
}
