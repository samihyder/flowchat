#!/usr/bin/env node
/**
 * Regenerate / patch FlowChat user stories workbook from current product state.
 * Run: node scripts/update-flowchat-user-stories.mjs
 */
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'userstory-wireframes/FlowChat_User_Stories_S1_S6.xlsx');
const XLSX_ROOT_COPY = path.join(ROOT, 'FlowChat_User_Stories_S1_S6.xlsx');

const SHEET_STORIES = 'User Stories S1–S6';
const SHEET_SUMMARY = 'Sprint Summary';

const NEW_STORIES = [
  {
    'Story ID': 'S6-24',
    Sprint: 'S6',
    'Sprint Name': 'CRM + Email Marketing',
    'Sprint Dates': '2026-09-07 → 2026-10-04',
    'Epic / Theme': 'CRM — Companies',
    'User Story':
      'As a Platform, I want a global company registry keyed by corporate email domain (shared across tenants), so that the same business is not duplicated per workspace.',
    Role: 'Platform',
    'Story Points': 5,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• `companies` table with unique domain and firmographic fields\n• `contacts.company_id` FK links tenant contacts to global companies\n• Migration 0019 applied in production deploy script',
  },
  {
    'Story ID': 'S6-25',
    Sprint: 'S6',
    'Sprint Name': 'CRM + Email Marketing',
    'Sprint Dates': '2026-09-07 → 2026-10-04',
    'Epic / Theme': 'CRM — Companies',
    'User Story':
      'As a Agent, I want contacts with corporate emails to auto-link to a global company on create/update/import, so that company context appears without manual data entry.',
    Role: 'Agent',
    'Story Points': 3,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• Free-mail domains (Gmail, etc.) are skipped\n• Company created with `enrichment_status=pending` when new domain\n• Wired on manual CRUD, CSV import, widget sessions, and integration upserts',
  },
  {
    'Story ID': 'S6-26',
    Sprint: 'S6',
    'Sprint Name': 'CRM + Email Marketing',
    'Sprint Dates': '2026-09-07 → 2026-10-04',
    'Epic / Theme': 'CRM — Enrichment',
    'User Story':
      'As a Admin, I want to connect data enrichment APIs (Companies House, PDL, Lusha, Cognism, OpenMart, Explorium) in Connected services, so that my workspace can enrich contacts with our own API keys.',
    Role: 'Admin',
    'Story Points': 5,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• `data_enrichment` category in account_service_credentials\n• Add, test, rotate, and remove enrichment connections in Settings → Connected services\n• Keys encrypted; verification before save; safe user-facing errors',
  },
  {
    'Story ID': 'S6-27',
    Sprint: 'S6',
    'Sprint Name': 'CRM + Email Marketing',
    'Sprint Dates': '2026-09-07 → 2026-10-04',
    'Epic / Theme': 'CRM — Enrichment',
    'User Story':
      'As a Agent, I want to run enrichment on a contact using a tenant-selected connected provider, so that firmographic and person data is fetched without auto-overwriting the contact.',
    Role: 'Agent',
    'Story Points': 5,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• POST /contacts/:id/enrich with credentialId and scope (auto/company/person)\n• Provider adapter calls BYOK API; usage counted on credential\n• Results stored as pending suggestions, not applied immediately',
  },
  {
    'Story ID': 'S6-28',
    Sprint: 'S6',
    'Sprint Name': 'CRM + Email Marketing',
    'Sprint Dates': '2026-09-07 → 2026-10-04',
    'Epic / Theme': 'CRM — Enrichment',
    'User Story':
      'As a Agent, I want to review enrichment suggestions and apply only the fields I select, so that I control what data is saved to the contact and linked company.',
    Role: 'Agent',
    'Story Points': 5,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• `contact_enrichment_suggestions` table stores field-level proposals with source\n• Contact profile shows review table: current vs suggested, checkboxes\n• Apply selected updates contact/company; Dismiss discards without save',
  },
  {
    'Story ID': 'S7B-1',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want tenant-owned API credentials stored encrypted, so that email and AI providers use our keys securely.',
    Role: 'Admin',
    'Story Points': 5,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• account_service_credentials with AES-256-GCM encryption\n• secret_prefix masking in UI; plaintext never returned from API',
  },
  {
    'Story ID': 'S7B-2',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want a Connected services settings page to manage email, AI, and enrichment providers.',
    Role: 'Admin',
    'Story Points': 3,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• Settings → Connected services lists connections by category\n• Add, edit, test, remove, set default per category',
  },
  {
    'Story ID': 'S7B-3',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'User Story':
      'As a Marketer, I want marketing emails sent via my connected Resend (or other ESP) key.',
    Role: 'Marketer',
    'Story Points': 5,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• Resend verify + send adapter\n• Optional domain check for from-address',
  },
  {
    'Story ID': 'S7B-4',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want SendGrid and Mailgun as alternate email providers.',
    Role: 'Admin',
    'Story Points': 5,
    Priority: 'Should',
    Status: 'Completed',
    'Acceptance Criteria':
      '• Provider adapters with verify + send\n• Mailgun requires sending domain in config',
  },
  {
    'Story ID': 'S7B-5',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Marketer, I want each sender to use a specific connected credential.',
    Role: 'Marketer',
    'Story Points': 3,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• marketing_senders.credential_id FK\n• Send path resolves sender credential or account default',
  },
  {
    'Story ID': 'S7B-6',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want per-credential webhook URLs for email delivery events.',
    Role: 'Admin',
    'Story Points': 3,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• POST /api/webhooks/email/[credentialId] with signature verification\n• Events update campaign recipient status',
  },
  {
    'Story ID': 'S7B-7',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want Anthropic BYOK for widget AI replies.',
    Role: 'Admin',
    'Story Points': 5,
    Priority: 'Should',
    Status: 'Completed',
    'Acceptance Criteria':
      '• AI chat proxy route uses tenant credential\n• Widget AI toggle in Connected services',
  },
  {
    'Story ID': 'S7B-8',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want audit logs when service credentials are created, updated, or deleted.',
    Role: 'Admin',
    'Story Points': 3,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• Administrator-only credential CRUD\n• Test connection updates status and last_verified_at',
  },
  {
    'Story ID': 'S7B-9',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services',
    'User Story':
      'As a Admin, I want a workspace policy to require tenant email credentials (disable platform Resend fallback).',
    Role: 'Admin',
    'Story Points': 3,
    Priority: 'Should',
    Status: 'Completed',
    'Acceptance Criteria':
      '• marketingByokOnly account setting\n• Sends blocked with clear message when no tenant ESP configured',
  },
  {
    'Story ID': 'S7B-10',
    Sprint: 'S7B',
    'Sprint Name': 'Connected Services (BYOK)',
    'Sprint Dates': 'Implemented 2026-06',
    'Epic / Theme': 'Connected Services — Enrichment',
    'User Story':
      'As a Admin, I want data enrichment providers in Connected services alongside email and AI, so that enrichment BYOK is discoverable in one place.',
    Role: 'Admin',
    'Story Points': 3,
    Priority: 'Must',
    Status: 'Completed',
    'Acceptance Criteria':
      '• Data enrichment section in Settings → Connected services\n• Provider list matches S6-26 adapters; test connection and usage counters\n• Extends encrypted credential store from S7B-1',
  },
];

const S2_7_CRITERIA =
  '• Settings → Account page renders with editable name, timezone, and locale fields\n• Changes are saved via API and reflected immediately\n• Logo upload via R2 presigned URL; recommended 512×512px, max 10 MB\n• Logo preview and email signature templates use 512×512 source dimensions\n• Timezone affects timestamp displays throughout the dashboard';

function rebuildSummary(stories) {
  const sprintMeta = {
    S1: { Name: 'Foundation', Dates: '2026-06-15 → 2026-06-28' },
    S2: { Name: 'Teams & Agents', Dates: '2026-06-29 → 2026-07-12' },
    S3: { Name: 'Web Live Chat', Dates: '2026-07-13 → 2026-07-26' },
    S4: { Name: 'Lifecycle & Trust', Dates: '2026-07-27 → 2026-08-16' },
    S5: { Name: 'Rich Messaging', Dates: '2026-08-17 → 2026-09-06' },
    S6: { Name: 'CRM + Email Marketing', Dates: '2026-09-07 → 2026-10-04' },
    S7B: { Name: 'Connected Services (BYOK)', Dates: 'Implemented 2026-06' },
  };

  const rows = [];
  let totalStories = 0;
  let totalPoints = 0;

  for (const sprint of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7B']) {
    const subset = stories.filter((s) => s.Sprint === sprint);
    const pts = subset.reduce((a, s) => a + Number(s['Story Points'] || 0), 0);
    const must = subset.filter((s) => s.Priority === 'Must').length;
    const should = subset.filter((s) => s.Priority === 'Should').length;
    totalStories += subset.length;
    totalPoints += pts;
    rows.push({
      Sprint: sprint,
      Name: sprintMeta[sprint].Name,
      Dates: sprintMeta[sprint].Dates,
      'Total Stories': subset.length,
      'Total Points': pts,
      'Must Stories': must,
      'Should Stories': should,
      Status: '✅ Completed',
    });
  }

  rows.push({
    Sprint: 'TOTAL',
    Name: '',
    Dates: '',
    'Total Stories': totalStories,
    'Total Points': totalPoints,
    'Must Stories': '',
    'Should Stories': '',
    Status: '',
  });

  return rows;
}

function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  let stories = XLSX.utils.sheet_to_json(wb.Sheets[SHEET_STORIES], { defval: '' });

  // Patch S2-7 logo criteria
  stories = stories.map((s) =>
    s['Story ID'] === 'S2-7' ? { ...s, 'Acceptance Criteria': S2_7_CRITERIA } : s
  );

  // Append new stories (idempotent)
  const existingIds = new Set(stories.map((s) => s['Story ID']));
  for (const story of NEW_STORIES) {
    if (!existingIds.has(story['Story ID'])) {
      stories.push(story);
      existingIds.add(story['Story ID']);
    } else {
      stories = stories.map((s) => (s['Story ID'] === story['Story ID'] ? { ...s, ...story } : s));
    }
  }

  // Sort: S1, S2, ... then by story id
  const sprintOrder = { S1: 1, S2: 2, S3: 3, S4: 4, S5: 5, S6: 6, S7B: 7 };
  stories.sort((a, b) => {
    const sa = sprintOrder[a.Sprint] ?? 99;
    const sb = sprintOrder[b.Sprint] ?? 99;
    if (sa !== sb) return sa - sb;
    return String(a['Story ID']).localeCompare(String(b['Story ID']), undefined, { numeric: true });
  });

  const summary = rebuildSummary(stories);

  const wsStories = XLSX.utils.json_to_sheet(stories);
  const wsSummary = XLSX.utils.json_to_sheet(summary);

  wb.Sheets[SHEET_STORIES] = wsStories;
  wb.Sheets[SHEET_SUMMARY] = wsSummary;

  XLSX.writeFile(wb, XLSX_PATH);
  XLSX.writeFile(wb, XLSX_ROOT_COPY);

  console.log(`Updated ${XLSX_PATH}`);
  console.log(`  Stories: ${stories.length}`);
  console.log(`  Points:  ${summary.find((r) => r.Sprint === 'TOTAL')['Total Points']}`);
}

main();
