import type { AppSql } from '@/lib/db-sql';

/** Strip high-risk HTML before storing public help-center bodies. */
export function sanitizeHelpHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<\/?\s*(iframe|object|embed|link|meta|base)\b[^>]*>/gi, '');
}

export type Portal = {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  customDomain: string | null;
  color: string | null;
  logoUrl: string | null;
  headerText: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PortalCategory = {
  id: string;
  portalId: string;
  accountId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
};

export type Article = {
  id: string;
  portalId: string;
  categoryId: string | null;
  accountId: string;
  title: string;
  slug: string;
  bodyHtml: string;
  status: string;
  locale: string;
  metaDescription: string | null;
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PortalRow = {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  customDomain: string | null;
  color: string | null;
  logoUrl: string | null;
  headerText: string | null;
  isPublished: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serializePortal(row: PortalRow): Portal {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listPortals(sql: AppSql, accountId: string): Promise<Portal[]> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, slug,
           custom_domain as "customDomain", color, logo_url as "logoUrl",
           header_text as "headerText", is_published as "isPublished",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM portals WHERE account_id = ${accountId}::uuid ORDER BY name
  `;
  return (rows as PortalRow[]).map(serializePortal);
}

export async function getPortal(
  sql: AppSql,
  accountId: string,
  portalId: string
): Promise<Portal | null> {
  const rows = await sql`
    SELECT id, account_id as "accountId", name, slug,
           custom_domain as "customDomain", color, logo_url as "logoUrl",
           header_text as "headerText", is_published as "isPublished",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM portals WHERE id = ${portalId}::uuid AND account_id = ${accountId}::uuid LIMIT 1
  `;
  const row = rows[0] as PortalRow | undefined;
  return row ? serializePortal(row) : null;
}

export async function createPortal(
  sql: AppSql,
  accountId: string,
  input: {
    name: string;
    slug: string;
    customDomain?: string | null;
    color?: string | null;
    logoUrl?: string | null;
    headerText?: string | null;
    isPublished?: boolean;
  }
): Promise<Portal> {
  const rows = await sql`
    INSERT INTO portals (
      account_id, name, slug, custom_domain, color, logo_url, header_text, is_published
    )
    VALUES (
      ${accountId}::uuid, ${input.name}, ${input.slug},
      ${input.customDomain ?? null}, ${input.color ?? '#6366F1'},
      ${input.logoUrl ?? null}, ${input.headerText ?? null},
      ${input.isPublished ?? false}
    )
    RETURNING id, account_id as "accountId", name, slug,
              custom_domain as "customDomain", color, logo_url as "logoUrl",
              header_text as "headerText", is_published as "isPublished",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return serializePortal(rows[0] as PortalRow);
}

export async function updatePortal(
  sql: AppSql,
  accountId: string,
  portalId: string,
  input: Partial<{
    name: string;
    slug: string;
    customDomain: string | null;
    color: string | null;
    logoUrl: string | null;
    headerText: string | null;
    isPublished: boolean;
  }>
): Promise<Portal | null> {
  const rows = await sql`
    UPDATE portals SET
      name = COALESCE(${input.name ?? null}, name),
      slug = COALESCE(${input.slug ?? null}, slug),
      custom_domain = COALESCE(${input.customDomain ?? null}, custom_domain),
      color = COALESCE(${input.color ?? null}, color),
      logo_url = COALESCE(${input.logoUrl ?? null}, logo_url),
      header_text = COALESCE(${input.headerText ?? null}, header_text),
      is_published = COALESCE(${input.isPublished ?? null}, is_published),
      updated_at = NOW()
    WHERE id = ${portalId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, account_id as "accountId", name, slug,
              custom_domain as "customDomain", color, logo_url as "logoUrl",
              header_text as "headerText", is_published as "isPublished",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const row = rows[0] as PortalRow | undefined;
  return row ? serializePortal(row) : null;
}

export async function deletePortal(
  sql: AppSql,
  accountId: string,
  portalId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM portals WHERE id = ${portalId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listCategories(
  sql: AppSql,
  accountId: string,
  portalId: string
): Promise<PortalCategory[]> {
  const rows = await sql`
    SELECT id, portal_id as "portalId", account_id as "accountId", name,
           parent_id as "parentId", sort_order as "sortOrder", created_at as "createdAt"
    FROM portal_categories
    WHERE portal_id = ${portalId}::uuid AND account_id = ${accountId}::uuid
    ORDER BY sort_order, name
  `;
  return (rows as PortalCategory[]).map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

export async function createCategory(
  sql: AppSql,
  accountId: string,
  portalId: string,
  input: { name: string; parentId?: string | null; sortOrder?: number }
): Promise<PortalCategory> {
  const rows = await sql`
    INSERT INTO portal_categories (portal_id, account_id, name, parent_id, sort_order)
    VALUES (
      ${portalId}::uuid, ${accountId}::uuid, ${input.name},
      ${input.parentId ?? null}::uuid, ${input.sortOrder ?? 0}
    )
    RETURNING id, portal_id as "portalId", account_id as "accountId", name,
              parent_id as "parentId", sort_order as "sortOrder", created_at as "createdAt"
  `;
  const r = rows[0] as PortalCategory;
  return { ...r, createdAt: new Date(r.createdAt).toISOString() };
}

export async function updateCategory(
  sql: AppSql,
  accountId: string,
  categoryId: string,
  input: Partial<{ name: string; parentId: string | null; sortOrder: number }>
): Promise<PortalCategory | null> {
  const rows = await sql`
    UPDATE portal_categories SET
      name = COALESCE(${input.name ?? null}, name),
      parent_id = COALESCE(${input.parentId ?? null}::uuid, parent_id),
      sort_order = COALESCE(${input.sortOrder ?? null}, sort_order)
    WHERE id = ${categoryId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, portal_id as "portalId", account_id as "accountId", name,
              parent_id as "parentId", sort_order as "sortOrder", created_at as "createdAt"
  `;
  const r = rows[0] as PortalCategory | undefined;
  return r ? { ...r, createdAt: new Date(r.createdAt).toISOString() } : null;
}

export async function deleteCategory(
  sql: AppSql,
  accountId: string,
  categoryId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM portal_categories
    WHERE id = ${categoryId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listArticles(
  sql: AppSql,
  accountId: string,
  portalId: string
): Promise<Article[]> {
  const rows = await sql`
    SELECT id, portal_id as "portalId", category_id as "categoryId", account_id as "accountId",
           title, slug, body_html as "bodyHtml", status, locale,
           meta_description as "metaDescription", author_id as "authorId",
           published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"
    FROM articles
    WHERE portal_id = ${portalId}::uuid AND account_id = ${accountId}::uuid
    ORDER BY updated_at DESC
  `;
  return (rows as Article[]).map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  }));
}

export async function createArticle(
  sql: AppSql,
  accountId: string,
  portalId: string,
  authorId: string | null,
  input: {
    title: string;
    slug: string;
    bodyHtml?: string;
    categoryId?: string | null;
    status?: string;
    locale?: string;
    metaDescription?: string | null;
  }
): Promise<Article> {
  const status = input.status ?? 'draft';
  const bodyHtml = sanitizeHelpHtml(input.bodyHtml ?? '');
  const rows = await sql`
    INSERT INTO articles (
      portal_id, category_id, account_id, title, slug, body_html,
      status, locale, meta_description, author_id, published_at
    )
    VALUES (
      ${portalId}::uuid, ${input.categoryId ?? null}::uuid, ${accountId}::uuid,
      ${input.title}, ${input.slug}, ${bodyHtml},
      ${status}, ${input.locale ?? 'en'}, ${input.metaDescription ?? null},
      ${authorId}::uuid,
      ${status === 'published' ? new Date().toISOString() : null}::timestamptz
    )
    RETURNING id, portal_id as "portalId", category_id as "categoryId", account_id as "accountId",
              title, slug, body_html as "bodyHtml", status, locale,
              meta_description as "metaDescription", author_id as "authorId",
              published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const r = rows[0] as Article;
  return {
    ...r,
    publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function updateArticle(
  sql: AppSql,
  accountId: string,
  articleId: string,
  input: Partial<{
    title: string;
    slug: string;
    bodyHtml: string;
    categoryId: string | null;
    status: string;
    locale: string;
    metaDescription: string | null;
  }>
): Promise<Article | null> {
  const publishNow = input.status === 'published';
  const sanitizedBody =
    input.bodyHtml != null ? sanitizeHelpHtml(input.bodyHtml) : null;
  const rows = await sql`
    UPDATE articles SET
      title = COALESCE(${input.title ?? null}, title),
      slug = COALESCE(${input.slug ?? null}, slug),
      body_html = COALESCE(${sanitizedBody}, body_html),
      category_id = COALESCE(${input.categoryId ?? null}::uuid, category_id),
      status = COALESCE(${input.status ?? null}, status),
      locale = COALESCE(${input.locale ?? null}, locale),
      meta_description = COALESCE(${input.metaDescription ?? null}, meta_description),
      published_at = CASE
        WHEN ${publishNow} AND published_at IS NULL THEN NOW()
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = ${articleId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id, portal_id as "portalId", category_id as "categoryId", account_id as "accountId",
              title, slug, body_html as "bodyHtml", status, locale,
              meta_description as "metaDescription", author_id as "authorId",
              published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const r = rows[0] as Article | undefined;
  if (!r) return null;
  return {
    ...r,
    publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function deleteArticle(
  sql: AppSql,
  accountId: string,
  articleId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM articles WHERE id = ${articleId}::uuid AND account_id = ${accountId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getPublishedPortalBySlug(
  sql: AppSql,
  accountSlug: string,
  portalSlug: string
) {
  const rows = await sql`
    SELECT p.id, p.account_id as "accountId", p.name, p.slug,
           p.custom_domain as "customDomain", p.color, p.logo_url as "logoUrl",
           p.header_text as "headerText", p.is_published as "isPublished",
           a.name as "accountName", a.slug as "accountSlug"
    FROM portals p
    INNER JOIN accounts a ON a.id = p.account_id
    WHERE a.slug = ${accountSlug} AND p.slug = ${portalSlug} AND p.is_published = true
    LIMIT 1
  `;
  const portal = rows[0] as
    | (Portal & { accountName: string; accountSlug: string })
    | undefined;
  if (!portal) return null;

  const categories = await listCategories(sql, portal.accountId, portal.id);
  const articles = await sql`
    SELECT id, portal_id as "portalId", category_id as "categoryId", account_id as "accountId",
           title, slug, body_html as "bodyHtml", status, locale,
           meta_description as "metaDescription", author_id as "authorId",
           published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"
    FROM articles
    WHERE portal_id = ${portal.id}::uuid AND status = 'published'
    ORDER BY title
  `;

  return {
    portal: {
      ...portal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    categories,
    articles: (articles as Article[]).map((r) => ({
      ...r,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
  };
}
