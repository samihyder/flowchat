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
    } catch {}
  }
}
loadEnv();
const sql = neon(process.env.DATABASE_URL);

const campaignId = 'ae598a05-6428-46a4-b926-0a9b68a52f8e';

const msgIds = await sql`
  SELECT provider_message_id, status, sent_at, last_error_code
  FROM marketing_campaign_recipient_steps
  WHERE campaign_id = ${campaignId}::uuid
`;

console.log('=== RECIPIENT STEPS ===');
console.log(msgIds);

const events = await sql`
  SELECT event_type, metadata, created_at
  FROM contact_email_events
  WHERE metadata->>'messageId' IN (
    SELECT provider_message_id FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND provider_message_id IS NOT NULL
  )
  OR metadata->>'message_id' IN (
    SELECT provider_message_id FROM marketing_campaign_recipient_steps
    WHERE campaign_id = ${campaignId}::uuid AND provider_message_id IS NOT NULL
  )
  ORDER BY created_at
`;
console.log('\n=== CONTACT EMAIL EVENTS ===');
for (const e of events) console.log(e);

const campaign = await sql`
  SELECT account_id, credential_id, from_name, from_email, launched_at
  FROM marketing_campaigns WHERE id = ${campaignId}::uuid
`;
console.log('\n=== CAMPAIGN META ===');
console.log(campaign[0]);

const creds = await sql`
  SELECT id, provider, label, status
  FROM account_service_credentials
  WHERE account_id = ${campaign[0].account_id}::uuid AND service_type = 'email'
`;
console.log('\n=== ACCOUNT EMAIL CREDENTIALS ===');
console.log(creds);

const allActivity = await sql`
  SELECT event_type, payload, created_at FROM marketing_campaign_activity
  WHERE campaign_id = ${campaignId}::uuid ORDER BY created_at ASC
`;
console.log('\n=== FULL ACTIVITY LOG ===');
for (const a of allActivity) console.log(`[${a.created_at}] ${a.event_type}`, a.payload);
