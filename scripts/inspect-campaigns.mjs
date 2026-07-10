/**
 * Inspect marketing campaigns, recipient steps, and activity logs.
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
const sql = neon(process.env.DATABASE_URL);

const campaigns = await sql`
  SELECT id, name, status, launched_at, paused_at, cancelled_at,
         schedule_timezone, schedule_mode, from_email, credential_id,
         created_at, updated_at
  FROM marketing_campaigns
  ORDER BY created_at DESC
`;

console.log(`\n=== CAMPAIGNS (${campaigns.length}) ===\n`);
if (!campaigns.length) {
  console.log('No campaigns found.');
  process.exit(0);
}

for (const c of campaigns) {
  console.log(`Campaign: ${c.name}`);
  console.log(`  id: ${c.id}`);
  console.log(`  status: ${c.status}`);
  console.log(`  launched: ${c.launched_at ?? '—'}`);
  console.log(`  timezone: ${c.schedule_timezone ?? 'UTC'} | mode: ${c.schedule_mode ?? 'campaign'}`);
  console.log(`  from: ${c.from_name ?? ''} <${c.from_email ?? '—'}>`);
  console.log(`  credential: ${c.credential_id ?? '—'}`);

  const steps = await sql`
    SELECT id, step_order, send_at, subject, LEFT(html_body, 60) as body_preview
    FROM marketing_campaign_steps
    WHERE campaign_id = ${c.id}::uuid
    ORDER BY step_order
  `;
  console.log(`  steps (${steps.length}):`);
  for (const s of steps) {
    console.log(`    #${s.step_order} send_at=${s.send_at ?? '—'} subject="${s.subject}"`);
  }

  const recipients = await sql`
    SELECT r.id, r.email, r.stopped_reason, r.stopped_at, ct.name as contact_name
    FROM marketing_campaign_recipients r
    LEFT JOIN contacts ct ON ct.id = r.contact_id
    WHERE r.campaign_id = ${c.id}::uuid
  `;
  console.log(`  recipients (${recipients.length}):`);
  for (const r of recipients) {
    console.log(`    ${r.contact_name ?? '—'} <${r.email}> stopped=${r.stopped_reason ?? 'no'}`);
  }

  const rs = await sql`
    SELECT rs.status, rs.scheduled_at, rs.sent_at, rs.last_error_code, rs.provider_message_id,
           rs.retry_count, st.step_order
    FROM marketing_campaign_recipient_steps rs
    JOIN marketing_campaign_steps st ON st.id = rs.campaign_step_id
    WHERE rs.campaign_id = ${c.id}::uuid
    ORDER BY st.step_order, rs.scheduled_at
  `;
  console.log(`  recipient_steps (${rs.length}):`);
  for (const row of rs) {
    const err = row.last_error_code ? ` ERROR=${row.last_error_code}` : '';
    console.log(
      `    step#${row.step_order} status=${row.status} scheduled=${row.scheduled_at ?? '—'} sent=${row.sent_at ?? '—'} retries=${row.retry_count}${err}`
    );
    if (row.provider_message_id) console.log(`      msgId=${row.provider_message_id}`);
  }

  const activity = await sql`
    SELECT event_type, payload, created_at
    FROM marketing_campaign_activity
    WHERE campaign_id = ${c.id}::uuid
    ORDER BY created_at DESC
    LIMIT 30
  `;
  console.log(`  activity log (${activity.length} recent):`);
  for (const a of activity) {
    const payload = JSON.stringify(a.payload).slice(0, 120);
    console.log(`    [${a.created_at}] ${a.event_type} ${payload}`);
  }

  const statusCounts = await sql`
    SELECT status, COUNT(*)::int as cnt
    FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${c.id}::uuid
    GROUP BY status
    ORDER BY cnt DESC
  `;
  console.log(`  step status summary: ${statusCounts.map((x) => `${x.status}=${x.cnt}`).join(', ') || 'none'}`);

  const duePending = await sql`
    SELECT COUNT(*)::int as cnt
    FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${c.id}::uuid
      AND status = 'pending'
      AND scheduled_at <= NOW()
  `;
  console.log(`  due now (pending+overdue): ${duePending[0].cnt}`);
  console.log('');
}

const cron = await sql`
  SELECT value FROM marketing_system_state WHERE key = 'marketing_cron' LIMIT 1
`;
if (cron[0]) {
  console.log('=== CRON STATE ===');
  console.log(JSON.stringify(cron[0].value, null, 2));
}
