/** Shared SQL client type (tagged-template queries via postgres.js). */
export type AppSql = (
  strings: TemplateStringsArray,
  ...params: unknown[]
) => Promise<Record<string, unknown>[]>;
