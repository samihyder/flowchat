import { neon } from '@neondatabase/serverless';
import { authorizeSuperAdmin, getBearerToken } from '@/lib/db-auth';
import type { AppSql } from '@/lib/db-sql';
import apiRoutes from '@/lib/admin/api-routes.generated.json';

type DiscoveredRoute = { path: string; methods: string[]; filePath: string };

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = await authorizeSuperAdmin(token);
  if (!userId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const entries = await sql`
    SELECT path, method, description_html as "descriptionHtml", updated_at as "updatedAt"
    FROM api_catalog_entries
  `;
  const descByKey = new Map(
    (entries as { path: string; method: string; descriptionHtml: string; updatedAt: Date }[]).map((e) => [
      `${e.path}::${e.method}`,
      { descriptionHtml: e.descriptionHtml, updatedAt: new Date(e.updatedAt).toISOString() },
    ])
  );

  const endpoints = (apiRoutes as DiscoveredRoute[]).flatMap((route) =>
    route.methods.map((method) => {
      const desc = descByKey.get(`${route.path}::${method}`);
      return {
        path: route.path,
        method,
        filePath: route.filePath,
        descriptionHtml: desc?.descriptionHtml ?? '',
        updatedAt: desc?.updatedAt ?? null,
      };
    })
  );

  return Response.json({ endpoints, total: endpoints.length });
}

export async function PATCH(req: Request) {
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = await authorizeSuperAdmin(token);
  if (!userId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { path?: string; method?: string; descriptionHtml?: string };
  const path = body.path?.trim();
  const method = body.method?.trim().toUpperCase();
  if (!path || !method) return Response.json({ error: 'path and method are required' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  const rows = await sql`
    INSERT INTO api_catalog_entries (path, method, description_html, updated_by)
    VALUES (${path}, ${method}, ${body.descriptionHtml ?? ''}, ${userId}::uuid)
    ON CONFLICT (path, method)
    DO UPDATE SET description_html = ${body.descriptionHtml ?? ''}, updated_by = ${userId}::uuid, updated_at = NOW()
    RETURNING path, method, description_html as "descriptionHtml", updated_at as "updatedAt"
  `;

  const row = rows[0] as { path: string; method: string; descriptionHtml: string; updatedAt: Date };
  return Response.json({
    entry: { ...row, updatedAt: new Date(row.updatedAt).toISOString() },
  });
}
