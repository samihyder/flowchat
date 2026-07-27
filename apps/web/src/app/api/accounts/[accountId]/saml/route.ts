import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import { getSamlConfig, upsertSamlConfig } from '@/lib/enterprise/roles-saml';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(_req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const config = await getSamlConfig(sql, accountId);
  return Response.json({ config });
}

export async function PUT(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth || auth.role !== 'administrator') {
    return Response.json({ error: 'Administrator required' }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const config = await upsertSamlConfig(sql, accountId, {
    idpEntityId: body.idpEntityId as string | null | undefined,
    idpSsoUrl: body.idpSsoUrl as string | null | undefined,
    idpCertificate: body.idpCertificate as string | null | undefined,
    spEntityId: body.spEntityId as string | null | undefined,
    roleAttribute: body.roleAttribute as string | null | undefined,
    isEnabled: body.isEnabled as boolean | undefined,
  });
  return Response.json({ config });
}
