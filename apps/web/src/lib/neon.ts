import postgres from 'postgres';
import type { AppSql } from '@/lib/db-sql';

type Sql = ReturnType<typeof postgres>;

const pools = new Map<string, Sql>();

function getPool(url: string): Sql {
  let pool = pools.get(url);
  if (!pool) {
    pool = postgres(url, {
      // Transaction-mode poolers (Supabase :6543) reject prepared statements.
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: 'require',
    });
    pools.set(url, pool);
  }
  return pool;
}

/**
 * Drop-in replacement for `@neondatabase/serverless` `neon()`.
 * Same tagged-template API; backed by postgres.js (works with Supabase pooler).
 */
export function neon(url: string): AppSql {
  if (!url) throw new Error('DATABASE_URL not configured');
  const sql = getPool(url);
  return ((strings: TemplateStringsArray, ...params: unknown[]) =>
    sql(strings, ...(params as never[]))) as AppSql;
}
