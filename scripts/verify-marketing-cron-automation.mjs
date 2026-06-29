/**
 * Verify marketing cron + automation email sequence wiring.
 * Usage: node scripts/verify-marketing-cron-automation.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const webRoot = resolve(root, 'apps/web');
const require = createRequire(pathToFileURL(resolve(webRoot, 'package.json')));
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

const DATABASE_URL = process.env.DATABASE_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const WEB_APP_URL =
  process.env.WEB_APP_URL ??
  process.env.NEXT_PUBLIC_WEB_APP_URL ??
  'https://www.digitalbrandcast.com/FlowChat';
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '/FlowChat').replace(/\/$/, '');

let failed = 0;
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  failed++;
}

if (!DATABASE_URL) {
  fail('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// --- schema ---
for (const table of [
  'marketing_campaigns',
  'marketing_campaign_recipient_steps',
  'marketing_system_state',
  'marketing_workflows',
  'marketing_workflow_steps',
  'marketing_workflow_enrollments',
  'email_templates',
]) {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
    LIMIT 1
  `;
  if (rows[0]) pass(`table ${table} exists`);
  else fail(`table ${table} missing`);
}

// timezone columns
const tzCol = await sql`
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'marketing_campaigns' AND column_name = 'schedule_timezone'
  LIMIT 1
`;
if (tzCol[0]) pass('marketing_campaigns.schedule_timezone column');
else fail('migration 0024 not applied — schedule_timezone missing');

// --- vercel cron config ---
try {
  const vercelJson = JSON.parse(readFileSync(resolve(webRoot, 'vercel.json'), 'utf8'));
  const cron = vercelJson.crons?.find((c) => c.path?.includes('/api/cron/marketing'));
  if (cron) pass(`vercel.json cron: ${cron.path} (${cron.schedule})`);
  else fail('vercel.json missing marketing cron');
} catch (e) {
  fail(`vercel.json read failed: ${e}`);
}

if (CRON_SECRET) pass('CRON_SECRET configured locally');
else fail('CRON_SECRET not in .env — Vercel cron auth may fail');

// --- hit production cron (optional) ---
const cronUrl = WEB_APP_URL.endsWith(BASE_PATH)
  ? `${WEB_APP_URL}/api/cron/marketing`
  : `${WEB_APP_URL}${BASE_PATH}/api/cron/marketing`;

if (CRON_SECRET && process.argv.includes('--hit-cron')) {
  try {
    const res = await fetch(cronUrl, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) {
      pass(`cron HTTP ${res.status} — s6mProcessed=${body.s6mProcessed} s6mSent=${body.s6mSent}`);
    } else {
      fail(`cron HTTP ${res.status} — ${JSON.stringify(body)}`);
    }
  } catch (e) {
    fail(`cron fetch failed: ${e}`);
  }
} else {
  console.log(`· Skipping live cron hit (pass --hit-cron to test ${cronUrl})`);
}

// --- automation sequence: wait steps + send_email ---
const wfRows = await sql`
  SELECT w.id, w.name,
    (SELECT COUNT(*)::int FROM marketing_workflow_steps s WHERE s.workflow_id = w.id AND s.step_type = 'wait') as wait_steps,
    (SELECT COUNT(*)::int FROM marketing_workflow_steps s WHERE s.workflow_id = w.id AND s.step_type = 'send_email') as email_steps
  FROM marketing_workflows w
  WHERE w.trigger_type = 'manual'
  ORDER BY w.created_at DESC
  LIMIT 5
`;
if (wfRows.length) {
  pass(`found ${wfRows.length} manual automation(s) in DB`);
  for (const w of wfRows) {
    console.log(`  · ${w.name}: ${w.wait_steps} wait + ${w.email_steps} send_email steps`);
  }
} else {
  console.log('· No automations in DB (OK for clean slate)');
}

const cronState = await sql`
  SELECT value FROM marketing_system_state WHERE key = 'marketing_cron' LIMIT 1
`.catch(() => []);
if (cronState[0]) {
  const v = cronState[0].value;
  pass(`marketing_cron state: lastRunAt=${v.lastRunAt ?? 'never'}`);
} else {
  console.log('· No marketing_cron heartbeat yet (run cron once)');
}

// --- lib import: job runner includes s6m + workflows ---
try {
  const jobRunner = readFileSync(resolve(webRoot, 'src/lib/marketing/job-runner.ts'), 'utf8');
  if (jobRunner.includes('processS6mCampaignBatch') && jobRunner.includes('processWorkflowBatch')) {
    pass('job-runner processes S6M campaigns + workflow automations');
  } else fail('job-runner missing expected processors');
} catch {
  fail('job-runner.ts not readable');
}

try {
  const builder = readFileSync(resolve(webRoot, 'src/lib/marketing/automation-builder.ts'), 'utf8');
  if (builder.includes("step_type, 'wait'") || builder.includes("'wait'")) {
    pass('automation-builder inserts wait steps before scheduled emails');
  } else fail('automation-builder wait step logic missing');
} catch {
  fail('automation-builder.ts not readable');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
