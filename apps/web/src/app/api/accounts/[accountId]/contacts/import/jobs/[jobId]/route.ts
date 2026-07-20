import { neon } from '@/lib/neon';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { processImportJobBatch, importErrorsToCsv } from '@/lib/contact-import';
import type { AppSql } from '@/lib/db-sql';

type Params = { params: Promise<{ accountId: string; jobId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { accountId, jobId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const downloadErrors = url.searchParams.get('download') === 'errors';

  const sql = neon(process.env.DATABASE_URL!) as AppSql;

  if (downloadErrors) {
    const rows = await sql`
      SELECT errors FROM contact_import_jobs
      WHERE id = ${jobId}::uuid AND account_id = ${accountId}::uuid
      LIMIT 1
    `;
    if (!rows[0]) return Response.json({ error: 'Job not found' }, { status: 404 });
    const errors = (rows[0] as { errors: { row: number; message: string }[] }).errors ?? [];
    const csv = importErrorsToCsv(errors);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="import-errors-${jobId.slice(0, 8)}.csv"`,
      },
    });
  }

  const result = await processImportJobBatch(sql, jobId, 50);
  return Response.json({ job: result.job, done: result.done });
}
