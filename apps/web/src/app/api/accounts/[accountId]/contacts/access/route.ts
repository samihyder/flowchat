import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { canExportContacts, canImportContacts } from '@/lib/crm-permissions';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const settings = await getAccountSettings(sql, accountId);

  return Response.json({
    importEnabled: settings.crmImportEnabled !== false,
    exportEnabled: settings.crmExportEnabled !== false,
    canImport: canImportContacts(settings, auth.userId, auth.role),
    canExport: canExportContacts(settings, auth.userId, auth.role),
    isAdmin: auth.role === 'administrator',
  });
}
