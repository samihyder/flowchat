import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { verifyEmailCredential } from '@/lib/credentials/providers/email';
import { verifyAnthropicKey } from '@/lib/credentials/providers/ai/anthropic';
import { verifyEnrichmentCredential } from '@/lib/credentials/providers/enrichment';
import {
  createCredential,
  listCredentials,
} from '@/lib/credentials/store';
import { withBasePath } from '@/lib/base-path';
import type { EmailProviderId, EnrichmentProviderId, ServiceCategory, ServiceProviderId } from '@/lib/credentials/types';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

function requireAdmin(auth: { role: string } | null) {
  return auth && auth.role === 'administrator';
}

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!requireAdmin(auth)) return Response.json({ error: 'Administrator required' }, { status: 403 });

  const url = new URL(req.url);
  const category = url.searchParams.get('category') as ServiceCategory | null;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const credentials = await listCredentials(sql, accountId, category ?? undefined);

  const origin = url.origin;
  const credentialsWithWebhooks = credentials.map((c) => ({
    ...c,
    webhookUrl:
      c.category === 'email_marketing'
        ? `${origin}${withBasePath(`/api/webhooks/email/${c.id}`)}`
        : null,
  }));

  return Response.json({ credentials: credentialsWithWebhooks });
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { accountId } = await params;
    const token = getBearerToken(req);
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await authorizeAccount(token, accountId);
    if (!requireAdmin(auth)) return Response.json({ error: 'Administrator required' }, { status: 403 });

    const body = (await req.json()) as {
      category?: ServiceCategory;
      provider?: ServiceProviderId;
      label?: string;
      secret?: string;
      config?: Record<string, unknown>;
      isDefault?: boolean;
    };

    if (!body.category || !body.provider || !body.label?.trim() || !body.secret?.trim()) {
      return Response.json({ error: 'Category, provider, label, and secret are required' }, { status: 400 });
    }

    if (body.category === 'email_marketing') {
      const verify = await verifyEmailCredential(
        body.provider as EmailProviderId,
        body.secret.trim(),
        body.config ?? {}
      );
      if (!verify.ok) return Response.json({ error: verify.error }, { status: 400 });
    } else if (body.category === 'ai_chat' && body.provider === 'anthropic') {
      const verify = await verifyAnthropicKey(body.secret.trim());
      if (!verify.ok) return Response.json({ error: verify.error }, { status: 400 });
    } else if (body.category === 'data_enrichment') {
      const verify = await verifyEnrichmentCredential(
        body.provider as EnrichmentProviderId,
        body.secret.trim(),
        body.config ?? {}
      );
      if (!verify.ok) return Response.json({ error: verify.error }, { status: 400 });
    } else {
      return Response.json({ error: 'Unsupported provider for category' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!) as AppSql;
    const credential = await createCredential(sql, {
      accountId,
      category: body.category,
      provider: body.provider,
      label: body.label.trim(),
      secret: body.secret.trim(),
      config: body.config ?? {},
      isDefault: body.isDefault,
      createdBy: auth!.userId,
    });

    await writeAuditLog(sql, {
      accountId,
      actorId: auth!.userId,
      action: 'service_credential.created',
      resourceType: 'service_credential',
      resourceId: credential.id,
      metadata: { category: body.category, provider: body.provider, label: body.label },
    });

    return Response.json({ credential }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save connection';
    console.error('[service-credentials] create failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
