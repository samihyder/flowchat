/**
 * Lib-level QA for S6M-6 / S6M-7 (no HTTP). Run from repo root:
 *   pnpm --filter @flowchat/api exec tsx scripts/qa-s6m-6-7-lib.mts
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
import { controlMarketingCampaign, getCampaignControlPreview } from '../apps/web/src/lib/marketing/s6m-campaign-control.ts';
import { duplicateMarketingCampaign } from '../apps/web/src/lib/marketing/s6m-campaign-duplicate.ts';
import {
  exportMarketingCampaignCsv,
  getMarketingCampaignStats,
} from '../apps/web/src/lib/marketing/s6m-campaign-stats.ts';
import { MarketingError } from '../apps/web/src/lib/marketing/errors.ts';
import type { AppSql } from '../apps/web/src/lib/db-sql.ts';

function loadEnv() {
  const raw = readFileSync(resolve(root, '.env'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL) as AppSql;
const results: { name: string; ok: boolean }[] = [];

function pass(name: string, detail = '') {
  results.push({ name, ok: true });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail = '') {
  results.push({ name, ok: false });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function createFixture(accountId: string, userId: string) {
  const campRows = await sql`
    INSERT INTO marketing_campaigns (account_id, name, status, current_step, created_by, launched_at, launched_by, test_sent_at, test_sent_to)
    VALUES (${accountId}::uuid, 'QA Lib Fixture', 'running', 4, ${userId}::uuid, NOW(), ${userId}::uuid, NOW(), 'qa@test.local')
    RETURNING id
  `;
  const campaignId = campRows[0].id as string;
  const stepRows = await sql`
    INSERT INTO marketing_campaign_steps (campaign_id, step_order, send_at, subject, html_body)
    VALUES (${campaignId}::uuid, 1, NOW() + interval '1 day', 'Step 1', '<p>x</p>')
    RETURNING id
  `;
  const stepId = stepRows[0].id as string;
  const contacts = await sql`
    SELECT id, email FROM contacts WHERE account_id = ${accountId}::uuid AND email IS NOT NULL LIMIT 2
  `;
  if (contacts.length < 1) throw new Error('Need contacts');
  for (const c of contacts as { id: string; email: string }[]) {
    const r = await sql`
      INSERT INTO marketing_campaign_recipients (campaign_id, contact_id, email)
      VALUES (${campaignId}::uuid, ${c.id}::uuid, ${c.email})
      RETURNING id
    `;
    await sql`
      INSERT INTO marketing_campaign_recipient_steps (campaign_id, campaign_step_id, recipient_id, status, scheduled_at)
      VALUES (${campaignId}::uuid, ${stepId}::uuid, ${r[0].id}::uuid, 'pending', NOW() + interval '1 hour')
    `;
  }
  return { campaignId, recipientCount: contacts.length };
}

async function main() {
  console.log('S6M-6 / S6M-7 lib QA\n');

  const admin = await sql`
    SELECT au.account_id, au.user_id FROM account_users au
    WHERE au.role = 'administrator' AND au.status = 'active' LIMIT 1
  `;
  if (!admin[0]) {
    fail('admin user');
    process.exit(1);
  }
  const accountId = admin[0].account_id as string;
  const userId = admin[0].user_id as string;
  pass('admin user');

  const { campaignId, recipientCount } = await createFixture(accountId, userId);
  pass('fixture', campaignId);

  const preview = await getCampaignControlPreview(sql, accountId, campaignId);
  if (preview.pendingSends >= 1) pass('control preview', `${preview.pendingSends} pending`);
  else fail('control preview');

  const paused = await controlMarketingCampaign(sql, accountId, campaignId, 'pause', 'administrator', userId);
  const pausedRow = await sql`SELECT status, paused_at FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  if (paused.status === 'paused' && pausedRow[0]?.paused_at) pass('pause');
  else fail('pause');

  const resumed = await controlMarketingCampaign(sql, accountId, campaignId, 'resume', 'administrator', userId);
  if (resumed.status === 'running') pass('resume');
  else fail('resume', resumed.status);

  try {
    await controlMarketingCampaign(sql, accountId, campaignId, 'pause', 'agent', userId);
    fail('agent forbidden');
  } catch (e) {
    if (e instanceof MarketingError && e.code === 'FORBIDDEN') pass('agent forbidden');
    else fail('agent forbidden', String(e));
  }

  const preCancelPreview = await getCampaignControlPreview(sql, accountId, campaignId);
  await controlMarketingCampaign(sql, accountId, campaignId, 'cancel', 'administrator', userId);
  const cancelledRow = await sql`SELECT status, cancelled_at FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  const skipped = await sql`
    SELECT COUNT(*)::int as n FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND status = 'skipped'
  `;
  const cancelActivity = await sql`
    SELECT payload FROM marketing_campaign_activity
    WHERE campaign_id = ${campaignId}::uuid AND event_type = 'campaign_cancelled'
  `;
  if (cancelledRow[0]?.status === 'cancelled' && cancelledRow[0]?.cancelled_at) pass('cancel');
  else fail('cancel');
  if ((skipped[0]?.n as number) >= recipientCount) pass('skip pending steps');
  else fail('skip pending steps');
  const payload = cancelActivity[0]?.payload as Record<string, unknown> | undefined;
  if (payload && (payload.pendingSends as number) === preCancelPreview.pendingSends) {
    pass('cancel activity has pre-skip preview');
  } else {
    fail('cancel activity has pre-skip preview');
  }

  const dup = await duplicateMarketingCampaign(sql, accountId, campaignId, userId);
  const dupMeta = await sql`
    SELECT status, current_step, launched_at, test_sent_at, name FROM marketing_campaigns WHERE id = ${dup.id}::uuid
  `;
  const dupRecipients = await sql`SELECT COUNT(*)::int as n FROM marketing_campaign_recipients WHERE campaign_id = ${dup.id}::uuid`;
  const dupSteps = await sql`SELECT send_at FROM marketing_campaign_steps WHERE campaign_id = ${dup.id}::uuid`;
  if (dup.status === 'draft' && dup.currentStep === 2) pass('duplicate draft step 2');
  else fail('duplicate draft step 2');
  if (String(dupMeta[0]?.name).endsWith('(copy)')) pass('duplicate name');
  else fail('duplicate name');
  if (!dupMeta[0]?.launched_at && !dupMeta[0]?.test_sent_at) pass('duplicate clears launch/test');
  else fail('duplicate clears launch/test');
  if ((dupRecipients[0]?.n as number) === 0) pass('duplicate no recipients');
  else fail('duplicate no recipients');
  if ((dupSteps as { send_at: Date | null }[]).every((s) => s.send_at === null)) pass('duplicate clears dates');
  else fail('duplicate clears dates');
  await sql`DELETE FROM marketing_campaigns WHERE id = ${dup.id}::uuid`;

  const stats = await getMarketingCampaignStats(sql, accountId, campaignId);
  if (
    stats.overview &&
    Array.isArray(stats.steps) &&
    Array.isArray(stats.recipients) &&
    Array.isArray(stats.activity)
  ) {
    pass('stats shape');
  } else fail('stats shape');
  if (stats.overview.totalRecipients === recipientCount) pass('stats recipient count');
  else fail('stats recipient count');

  try {
    const draft = await sql`
      INSERT INTO marketing_campaigns (account_id, name, status, created_by)
      VALUES (${accountId}::uuid, 'draft', 'draft', ${userId}::uuid) RETURNING id
    `;
    await getMarketingCampaignStats(sql, accountId, draft[0].id as string);
    fail('draft stats blocked');
    await sql`DELETE FROM marketing_campaigns WHERE id = ${draft[0].id}::uuid`;
  } catch (e) {
    if (e instanceof MarketingError && e.code === 'VALIDATION') pass('draft stats blocked');
    else fail('draft stats blocked', String(e));
  }

  const csv = await exportMarketingCampaignCsv(sql, accountId, campaignId);
  const lines = csv.trim().split('\n');
  if (lines.length - 1 === recipientCount) pass('export row count');
  else fail('export row count', `${lines.length - 1} vs ${recipientCount}`);

  await sql`DELETE FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  pass('cleanup');

  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n--- ${results.length - bad} passed, ${bad} failed ---`);
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
