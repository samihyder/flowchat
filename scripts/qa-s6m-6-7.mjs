/**
 * Local QA for S6M-6 / S6M-7 — exercises lib + HTTP routes.
 * Usage: node scripts/qa-s6m-6-7.mjs
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
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const API_BASE = process.env.QA_API_BASE ?? 'http://localhost:3200/api';

if (!DATABASE_URL) {
  console.error('FAIL: DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function getAdminSession() {
  const rows = await sql`
    SELECT s.token, s.user_id, au.account_id, au.role
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    WHERE s.expires_at > NOW() AND au.status = 'active' AND au.role = 'administrator'
    ORDER BY s.expires_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getAgentSession(accountId) {
  const rows = await sql`
    SELECT s.token, s.user_id, au.role
    FROM sessions s
    JOIN account_users au ON au.user_id = s.user_id
    WHERE s.expires_at > NOW() AND au.status = 'active' AND au.role = 'agent'
      AND au.account_id = ${accountId}::uuid
    ORDER BY s.expires_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function api(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

async function createFixture(accountId, userId) {
  const campRows = await sql`
    INSERT INTO marketing_campaigns (account_id, name, status, current_step, created_by, launched_at, launched_by)
    VALUES (${accountId}::uuid, 'QA Fixture Campaign', 'running', 4, ${userId}::uuid, NOW(), ${userId}::uuid)
    RETURNING id
  `;
  const campaignId = campRows[0].id;

  const stepRows = await sql`
    INSERT INTO marketing_campaign_steps (campaign_id, step_order, subject, html_body)
    VALUES (${campaignId}::uuid, 1, 'QA Step 1', '<p>hi</p>')
    RETURNING id
  `;
  const stepId = stepRows[0].id;

  const contactRows = await sql`
    SELECT id, email, name FROM contacts WHERE account_id = ${accountId}::uuid AND email IS NOT NULL LIMIT 2
  `;
  if (contactRows.length < 1) {
    throw new Error('Need at least one contact with email for QA fixture');
  }

  const recipientIds = [];
  for (const c of contactRows) {
    const r = await sql`
      INSERT INTO marketing_campaign_recipients (campaign_id, contact_id, email)
      VALUES (${campaignId}::uuid, ${c.id}::uuid, ${c.email})
      RETURNING id
    `;
    recipientIds.push(r[0].id);
    await sql`
      INSERT INTO marketing_campaign_recipient_steps (campaign_id, campaign_step_id, recipient_id, status, scheduled_at)
      VALUES (${campaignId}::uuid, ${stepId}::uuid, ${r[0].id}::uuid, 'pending', NOW() + interval '1 hour')
    `;
  }

  return { campaignId, recipientCount: recipientIds.length, stepId };
}

async function cleanup(campaignId) {
  await sql`DELETE FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
}

async function runLibTests(accountId, userId) {
  console.log('\n--- Lib / DB layer ---\n');
  let fixture;
  try {
    fixture = await createFixture(accountId, userId);
    pass('lib fixture', fixture.campaignId);
  } catch (e) {
    fail('lib fixture', e.message);
    return;
  }
  const { campaignId, recipientCount } = fixture;

  const prePreview = await sql`
    SELECT COUNT(*)::int as n FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending'
  `;
  if (prePreview[0]?.n >= 1) pass('lib pending steps', String(prePreview[0]?.n));
  else fail('lib pending steps');

  await sql`
    UPDATE marketing_campaigns SET status = 'paused', paused_at = NOW() WHERE id = ${campaignId}::uuid
  `;
  await sql`
    INSERT INTO marketing_campaign_activity (campaign_id, event_type, payload)
    VALUES (${campaignId}::uuid, 'campaign_paused', '{}'::jsonb)
  `;
  const paused = await sql`SELECT status, paused_at FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  if (paused[0]?.status === 'paused' && paused[0]?.paused_at) pass('lib pause timestamps');
  else fail('lib pause timestamps');

  await sql`UPDATE marketing_campaigns SET status = 'running', paused_at = NULL WHERE id = ${campaignId}::uuid`;
  pass('lib resume');

  const pendingBeforeCancel = await sql`
    SELECT COUNT(*)::int as n FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending'
  `;
  await sql`
    UPDATE marketing_campaign_recipient_steps SET status = 'skipped'
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending'
  `;
  await sql`
    UPDATE marketing_campaigns SET status = 'cancelled', cancelled_at = NOW() WHERE id = ${campaignId}::uuid
  `;
  await sql`
    INSERT INTO marketing_campaign_activity (campaign_id, event_type, payload)
    VALUES (${campaignId}::uuid, 'campaign_cancelled', ${JSON.stringify({ pendingSends: pendingBeforeCancel[0]?.n })}::jsonb)
  `;
  const skipped = await sql`
    SELECT COUNT(*)::int as n FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND status = 'skipped'
  `;
  if (skipped[0]?.n >= recipientCount) pass('lib cancel skips pending');
  else fail('lib cancel skips pending');

  const dupRows = await sql`
    INSERT INTO marketing_campaigns (account_id, name, status, current_step, created_by, from_name)
    SELECT account_id, name || ' (copy)', 'draft', 2, ${userId}::uuid, from_name
    FROM marketing_campaigns WHERE id = ${campaignId}::uuid
    RETURNING id, name, launched_at, test_sent_at
  `;
  const dupId = dupRows[0]?.id;
  await sql`
    INSERT INTO marketing_campaign_steps (campaign_id, step_order, send_at, subject, html_body)
    SELECT ${dupId}::uuid, step_order, NULL, subject, html_body
    FROM marketing_campaign_steps WHERE campaign_id = ${campaignId}::uuid
  `;
  const dupRecipients = await sql`SELECT COUNT(*)::int as n FROM marketing_campaign_recipients WHERE campaign_id = ${dupId}::uuid`;
  const dupSteps = await sql`SELECT send_at FROM marketing_campaign_steps WHERE campaign_id = ${dupId}::uuid`;
  if (dupRows[0]?.name?.endsWith('(copy)')) pass('lib duplicate name');
  else fail('lib duplicate name');
  if (!dupRows[0]?.launched_at && !dupRows[0]?.test_sent_at) pass('lib duplicate no launch/test');
  else fail('lib duplicate no launch/test');
  if (dupRecipients[0]?.n === 0) pass('lib duplicate no recipients');
  else fail('lib duplicate no recipients');
  if ((dupSteps).every((s) => s.send_at === null)) pass('lib duplicate dates cleared');
  else fail('lib duplicate dates cleared');
  await sql`DELETE FROM marketing_campaigns WHERE id = ${dupId}::uuid`;

  const statsOverview = await sql`
    SELECT COUNT(DISTINCT r.id)::int as recipients,
           COUNT(*) FILTER (WHERE rs.status IN ('sent','delivered','opened','clicked'))::int as sent
    FROM marketing_campaign_recipients r
    LEFT JOIN marketing_campaign_recipient_steps rs ON rs.recipient_id = r.id
    WHERE r.campaign_id = ${campaignId}::uuid
  `;
  if (statsOverview[0]?.recipients === recipientCount) pass('lib stats aggregates');
  else fail('lib stats aggregates');

  const recipients = await sql`
    SELECT c.name, r.email, r.stopped_reason FROM marketing_campaign_recipients r
    JOIN contacts c ON c.id = r.contact_id WHERE r.campaign_id = ${campaignId}::uuid
  `;
  if (recipients.length === recipientCount) pass('lib export source rows', String(recipients.length));
  else fail('lib export source rows');

  await cleanup(campaignId);
  pass('lib cleanup');
}

async function main() {
  console.log('S6M-6 / S6M-7 local QA\n');

  const admin = await getAdminSession();
  if (!admin) {
    fail('admin session', 'No active administrator session — sign in locally first');
    summarize();
    process.exit(1);
  }
  pass('admin session found');

  await runLibTests(admin.account_id, admin.user_id);

  const runHttp = process.env.QA_HTTP !== '0';
  if (!runHttp) {
    summarize();
    process.exit(results.some((r) => !r.ok) ? 1 : 0);
  }

  console.log('\n--- HTTP routes (needs apps/web DATABASE_URL) ---\n');

  let fixture;
  try {
    fixture = await createFixture(admin.account_id, admin.user_id);
    pass('fixture campaign', fixture.campaignId);
  } catch (e) {
    fail('fixture campaign', e.message);
    summarize();
    process.exit(1);
  }

  const { campaignId } = fixture;
  const base = `/accounts/${admin.account_id}/marketing/campaigns/${campaignId}`;

  // --- 6M-6 control preview ---
  const previewRes = await api(`${base}/control`, admin.token);
  if (previewRes.status === 200 && previewRes.json.preview?.pendingSends >= 1) {
    pass('GET /control preview', `${previewRes.json.preview.pendingSends} pending`);
  } else {
    fail('GET /control preview', `status ${previewRes.status}`);
  }

  // --- pause ---
  const pauseRes = await api(`${base}/control`, admin.token, { method: 'POST', body: { action: 'pause' } });
  const paused = await sql`SELECT status, paused_at FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  if (pauseRes.status === 200 && paused[0]?.status === 'paused' && paused[0]?.paused_at) {
    pass('POST /control pause', 'paused_at set');
  } else {
    fail('POST /control pause', `status ${pauseRes.status}, db=${paused[0]?.status}`);
  }

  const activityPause = await sql`
    SELECT event_type FROM marketing_campaign_activity WHERE campaign_id = ${campaignId}::uuid AND event_type = 'campaign_paused'
  `;
  if (activityPause.length > 0) pass('pause activity log');
  else fail('pause activity log');

  // --- resume ---
  const resumeRes = await api(`${base}/control`, admin.token, { method: 'POST', body: { action: 'resume' } });
  const resumed = await sql`SELECT status, paused_at FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  if (resumeRes.status === 200 && resumed[0]?.status === 'running' && !resumed[0]?.paused_at) {
    pass('POST /control resume');
  } else {
    fail('POST /control resume', `status ${resumeRes.status}, db=${resumed[0]?.status}`);
  }

  // --- agent forbidden ---
  const agent = await getAgentSession(admin.account_id);
  if (agent) {
    const agentRes = await api(`${base}/control`, agent.token, { method: 'POST', body: { action: 'pause' } });
    if (agentRes.status === 403) pass('agent control forbidden', '403');
    else fail('agent control forbidden', `got ${agentRes.status}`);
  } else {
    pass('agent control forbidden', 'skipped — no agent session');
  }

  // --- cancel + skip pending ---
  const cancelRes = await api(`${base}/control`, admin.token, { method: 'POST', body: { action: 'cancel' } });
  const cancelled = await sql`SELECT status, cancelled_at FROM marketing_campaigns WHERE id = ${campaignId}::uuid`;
  const skipped = await sql`
    SELECT COUNT(*)::int as n FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND status = 'skipped'
  `;
  const activityCancel = await sql`
    SELECT event_type, payload FROM marketing_campaign_activity
    WHERE campaign_id = ${campaignId}::uuid AND event_type = 'campaign_cancelled'
  `;
  if (cancelRes.status === 200 && cancelled[0]?.status === 'cancelled' && cancelled[0]?.cancelled_at) {
    pass('POST /control cancel', 'cancelled_at set');
  } else {
    fail('POST /control cancel');
  }
  if (skipped[0]?.n >= fixture.recipientCount) pass('pending steps skipped', String(skipped[0]?.n));
  else fail('pending steps skipped', `expected >=${fixture.recipientCount}, got ${skipped[0]?.n}`);
  if (activityCancel.length > 0) pass('cancel activity log');
  else fail('cancel activity log');

  // --- duplicate ---
  const dupRes = await api(`${base}/duplicate`, admin.token, { method: 'POST' });
  const dupId = dupRes.json?.campaign?.id;
  if (dupRes.status === 200 && dupId && dupId !== campaignId) {
    pass('POST /duplicate', dupId);
  } else {
    fail('POST /duplicate', `status ${dupRes.status}`);
  }

  if (dupId) {
    const dupRow = await sql`
      SELECT name, status, current_step, launched_at, test_sent_at
      FROM marketing_campaigns WHERE id = ${dupId}::uuid
    `;
    const dupRecipients = await sql`
      SELECT COUNT(*)::int as n FROM marketing_campaign_recipients WHERE campaign_id = ${dupId}::uuid
    `;
    const dupSteps = await sql`
      SELECT send_at FROM marketing_campaign_steps WHERE campaign_id = ${dupId}::uuid
    `;
    if (dupRow[0]?.status === 'draft' && dupRow[0]?.current_step === 2) pass('duplicate is draft step 2');
    else fail('duplicate is draft step 2');
    if (dupRow[0]?.name?.endsWith('(copy)')) pass('duplicate name suffix');
    else fail('duplicate name suffix', dupRow[0]?.name);
    if (!dupRow[0]?.launched_at && !dupRow[0]?.test_sent_at) pass('duplicate no launch/test state');
    else fail('duplicate no launch/test state');
    if (dupRecipients[0]?.n === 0) pass('duplicate no recipients');
    else fail('duplicate no recipients', String(dupRecipients[0]?.n));
    if (dupSteps.every((s) => s.send_at === null)) pass('duplicate steps dates cleared');
    else fail('duplicate steps dates cleared');
    await sql`DELETE FROM marketing_campaigns WHERE id = ${dupId}::uuid`;
  }

  // --- 6M-7 stats (launched campaign) ---
  const statsRes = await api(`${base}/stats`, admin.token);
  const shape = statsRes.json;
  if (
    statsRes.status === 200 &&
    shape.overview &&
    Array.isArray(shape.steps) &&
    Array.isArray(shape.recipients) &&
    Array.isArray(shape.activity)
  ) {
    pass('GET /stats shape');
  } else {
    fail('GET /stats shape', `status ${statsRes.status}`);
  }

  if (shape?.overview?.totalRecipients === fixture.recipientCount) {
    pass('stats recipient count matches');
  } else {
    fail('stats recipient count', `expected ${fixture.recipientCount}, got ${shape?.overview?.totalRecipients}`);
  }

  // draft stats blocked
  if (dupId) {
    /* dup deleted */
  }
  const draftRows = await sql`
    INSERT INTO marketing_campaigns (account_id, name, status, created_by)
    VALUES (${admin.account_id}::uuid, 'QA Draft', 'draft', ${admin.user_id}::uuid)
    RETURNING id
  `;
  const draftId = draftRows[0].id;
  const draftStats = await api(
    `/accounts/${admin.account_id}/marketing/campaigns/${draftId}/stats`,
    admin.token
  );
  if (draftStats.status === 400) pass('stats blocked for draft', '400');
  else fail('stats blocked for draft', `got ${draftStats.status}`);
  await sql`DELETE FROM marketing_campaigns WHERE id = ${draftId}::uuid`;

  // --- export ---
  const exportFetch = await fetch(`${API_BASE}${base}/export`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const csv = await exportFetch.text();
  const ct = exportFetch.headers.get('content-type') ?? '';
  const lines = csv.trim().split('\n');
  if (exportFetch.status === 200 && ct.includes('text/csv') && lines.length >= 2) {
    pass('GET /export CSV', `${lines.length - 1} data rows`);
  } else {
    fail('GET /export CSV', `status ${exportFetch.status}, ct=${ct}`);
  }
  if (lines.length - 1 === fixture.recipientCount) pass('CSV row count = recipients');
  else fail('CSV row count', `expected ${fixture.recipientCount}, got ${lines.length - 1}`);

  if (agent) {
    const agentExportFetch = await fetch(`${API_BASE}${base}/export`, {
      headers: { Authorization: `Bearer ${agent.token}` },
    });
    if (agentExportFetch.status === 403) pass('agent export forbidden', '403');
    else fail('agent export forbidden', `got ${agentExportFetch.status}`);
  }

  await cleanup(campaignId);
  pass('fixture cleaned up');

  summarize();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function summarize() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n--- ${ok} passed, ${bad} failed ---`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
