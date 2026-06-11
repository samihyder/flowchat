/** Shared Neon SQL client type (avoids generic variance across route handlers). */
export type AppSql = (
  strings: TemplateStringsArray,
  ...params: unknown[]
) => Promise<Record<string, unknown>[]>;
