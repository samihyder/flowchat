/**
 * Delete all S6M marketing campaigns and email templates (keeps automations/workflows).
 * Usage: node scripts/cleanup-marketing-campaigns-templates.mjs --confirm
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const require = createRequire(pathToFileURL(resolve(root, 'apps/web/package.json')));
const { neon } = require('@neondatabase/serverless');

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    try {
      const raw = readFileSync(resolve(root, file), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      /* optional */
    }
  }
}

loadEnv();

if (!process.argv.includes('--confirm')) {
  console.error('Refusing to run without --confirm');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const before = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM marketing_campaigns) as campaigns,
    (SELECT COUNT(*)::int FROM email_templates) as templates
`;

console.log('Before:', before[0]);

await sql`DELETE FROM marketing_campaigns`;
await sql`DELETE FROM email_templates`;

const after = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM marketing_campaigns) as campaigns,
    (SELECT COUNT(*)::int FROM email_templates) as templates
`;

console.log('After:', after[0]);
console.log('Done — campaigns and templates removed.');
