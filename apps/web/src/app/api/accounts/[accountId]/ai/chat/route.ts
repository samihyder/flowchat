import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { parseAccountSettings } from '@/lib/account-settings';
import { chatAnthropic } from '@/lib/credentials/providers/ai/anthropic';
import { getCredentialSecret, markCredentialUsed } from '@/lib/credentials/store';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    messages?: { role: 'user' | 'assistant'; content: string }[];
    system?: string;
    credentialId?: string;
    model?: string;
  };

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  let credentialId = body.credentialId;
  if (!credentialId) {
    const acc = await sql`
      SELECT settings FROM accounts WHERE id = ${accountId}::uuid LIMIT 1
    `;
    const settings = parseAccountSettings((acc[0] as { settings?: unknown } | undefined)?.settings);
    credentialId = settings.aiCredentialId;
  }

  if (!credentialId) {
    const defaults = await sql`
      SELECT id FROM account_service_credentials
      WHERE account_id = ${accountId}::uuid AND category = 'ai_chat' AND status = 'active'
      ORDER BY is_default DESC LIMIT 1
    `;
    credentialId = (defaults[0] as { id: string } | undefined)?.id;
  }

  if (!credentialId) {
    return Response.json({ error: 'No AI connection configured. Add Anthropic in Connected services.' }, { status: 400 });
  }

  const cred = await getCredentialSecret(sql, accountId, credentialId);
  if (!cred || cred.row.provider !== 'anthropic') {
    return Response.json({ error: 'AI credential not found' }, { status: 404 });
  }

  const messages = body.messages?.length ? body.messages : [{ role: 'user' as const, content: 'Hello' }];
  const model =
    body.model ??
    (typeof cred.row.config.model === 'string' ? cred.row.config.model : undefined);

  const result = await chatAnthropic(cred.secret, {
    model,
    system: body.system,
    messages,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  await markCredentialUsed(sql, cred.row.id);

  return Response.json({
    text: result.text,
    model: result.model,
    usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  });
}
