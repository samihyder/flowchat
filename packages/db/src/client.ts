import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: 'require',
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
