#!/usr/bin/env node
/**
 * Import Mutex master customer segment CSVs into FlowChat CRM + Mutex WA.
 *
 * Usage:
 *   node scripts/import-mutex-segments.mjs --dry-run
 *   node scripts/import-mutex-segments.mjs
 *
 * Env (auto-loaded from ../../.env, ../../.env.local, ../../../wa-automation/.env.local,
 *      ../../../mutexwebsite/.env.local):
 *   FLOWCHAT_DATABASE_URL
 *   FLOWCHAT_API_KEY          (fc_live_… — used to resolve account_id)
 *   FLOWCHAT_ACCOUNT_ID       (optional override)
 *   WA_SUPABASE_URL
 *   WA_SUPABASE_SERVICE_ROLE_KEY
 *   WA_ACCOUNT_ID             (optional override)
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { neon } = require('@neondatabase/serverless');

function loadSupabase() {
  const waRequire = createRequire(
    resolve(__dirname, '../../../../wa-automation/package.json'),
  );
  const { createClient } = waRequire('@supabase/supabase-js');
  return createClient;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const CSV_DIR =
  process.env.MUTEX_CSV_DIR ||
  '/Users/samihaider/Documents/DailyUse/Mutex-Systems/Sales-CRM';

const CSV_FILES = {
  pta: 'Master_Customer_Segments - PTA.csv',
  pakistani: 'Master_Customer_Segments - Pakistani Customers.csv',
  international: 'Master_Customer_Segments - International Customers.csv',
};

const SEGMENT_NAMES = {
  pta: 'PTA Operators',
  pakistani: 'Pakistani Customers',
  international: 'International Customers',
};

const FILE_TAG = {
  pta: 'Segment:PTA',
  pakistani: 'Segment:Pakistani',
  international: 'Segment:International',
};

const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = join(__dirname, 'import-output');

// ─── Env loading ────────────────────────────────────────────────────────────

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(__dirname, '../../../.env'));
loadEnvFile(resolve(__dirname, '../../../.env.local'));
loadEnvFile(resolve(__dirname, '../../../../wa-automation/.env.local'));
loadEnvFile(resolve(__dirname, '../../../../mutexwebsite/.env.local'));

const FLOWCHAT_DATABASE_URL =
  process.env.FLOWCHAT_DATABASE_URL || process.env.DATABASE_URL;
const WA_SUPABASE_URL =
  process.env.WA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const WA_SERVICE_KEY =
  process.env.WA_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── CSV parsing ────────────────────────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row.map((c) => c.trim()));
      row = [];
      field = '';
      if (c === '\r') i++;
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row.map((c) => c.trim()));
  }
  return rows;
}

function readCsv(filename) {
  const path = join(CSV_DIR, filename);
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const table = parseCsv(raw);
  if (table.length < 2) return { headers: [], rows: [] };
  const headers = table[0];
  const rows = table.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
  return { headers, rows };
}

// ─── Field helpers ──────────────────────────────────────────────────────────

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'yeah.net',
]);

function cleanName(raw) {
  return (raw || '')
    .replace(/^['`.]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitMulti(value) {
  if (!value?.trim()) return [];
  return value
    .split(/[|;]/)
    .flatMap((part) => part.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseEmails(...sources) {
  const seen = new Set();
  const out = [];
  for (const src of sources) {
    for (const e of splitMulti(src)) {
      const email = e.replace(/[.\s]+$/, '').toLowerCase().replace(/\s+/g, '');
      if (!email.includes('@') || !email.includes('.')) continue;
      if (seen.has(email)) continue;
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}

function parsePhones(...sources) {
  const seen = new Set();
  const out = [];
  for (const src of sources) {
    for (const chunk of splitMulti(src)) {
      const digits = chunk.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) continue;
      if (seen.has(digits)) continue;
      seen.add(digits);
      const formatted = chunk.trim().startsWith('+') ? `+${digits}` : digits;
      out.push(formatted);
    }
  }
  return out;
}

function pickPrimaryEmail(emails) {
  if (!emails.length) return null;
  const work = emails.find((e) => {
    const domain = e.split('@')[1] || '';
    return domain && !FREE_EMAIL_DOMAINS.has(domain);
  });
  return work || emails[0];
}

function pickPrimaryPhone(phones, country) {
  if (!phones.length) return null;
  if (country?.toLowerCase().includes('pakistan')) {
    const pkMobile = phones.find((p) => {
      const d = p.replace(/\D/g, '');
      return d.startsWith('92') && d.length >= 10;
    });
    if (pkMobile) return pkMobile;
  }
  return phones[0];
}

function countryToIso(country) {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  const map = {
    pakistan: 'PK',
    'united kingdom': 'GB',
    'united states': 'US',
    sweden: 'SE',
    switzerland: 'CH',
    australia: 'AU',
    unverified: null,
  };
  if (map[c] !== undefined) return map[c];
  if (c.length === 2) return c.toUpperCase();
  return null;
}

function hashExternalId(parts) {
  const base = parts.filter(Boolean).join('|').toLowerCase();
  return `mutex:${createHash('sha256').update(base).digest('hex').slice(0, 24)}`;
}

function sanitizeTagName(name) {
  const trimmed = name.trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 97)}...`;
}

function buildTags(fileKey, row, extra = []) {
  const tags = new Set([FILE_TAG[fileKey], ...extra.map(sanitizeTagName)]);
  const country = row.country || row.Country;
  if (country?.trim()) tags.add(sanitizeTagName(`Country:${country.trim()}`));
  return [...tags];
}

function hasUsefulData(fields) {
  const { name, emails, phones, company, linkedin, notes, license, region, vertical, keywords } =
    fields;
  if (emails.length || phones.length) return true;
  if (company?.trim()) return true;
  if (linkedin?.trim()) return true;
  if (notes?.trim()) return true;
  if (license?.trim()) return true;
  if (region?.trim()) return true;
  if (vertical?.trim()) return true;
  if (keywords?.trim()) return true;
  // name-only → drop
  if (name?.trim()) return false;
  return false;
}

// ─── File-specific normalizers ──────────────────────────────────────────────

function normalizePta(rows) {
  const people = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let name = cleanName(r['Full Name']);
    const emails = parseEmails(r['Email(s)']);
    const phones = parsePhones(r['Phone Number(s)']);
    const company = r['Company/Operator']?.trim() || '';
    const license = r['License No.']?.trim() || '';
    const region = r['Region']?.trim() || '';
    const sourceFiles = r['Source Files']?.trim() || '';

    const extraTags = [];
    if (sourceFiles) {
      for (const s of sourceFiles.split(',').map((x) => x.trim()).filter(Boolean)) {
        extraTags.push(sanitizeTagName(`Source:${s}`));
      }
    }
    if (company) extraTags.push(sanitizeTagName(`Operator:${company}`));

    if (
      !hasUsefulData({
        name,
        emails,
        phones,
        company,
        license,
        region,
      })
    ) {
      skipped.push({ file: 'pta', row: i + 2, reason: 'name-only or empty', name });
      continue;
    }

    if (!name) {
      if (emails[0]) {
        const local = emails[0].split('@')[0].replace(/[._-]+/g, ' ');
        name = cleanName(local) || emails[0];
      } else {
        skipped.push({ file: 'pta', row: i + 2, reason: 'missing name', raw: r['Full Name'] });
        continue;
      }
    }

    const tags = buildTags('pta', { country: r.Country || 'Pakistan' }, extraTags);
    const primaryEmail = pickPrimaryEmail(emails);
    const primaryPhone = pickPrimaryPhone(phones, r.Country);

    people.push({
      externalId: hashExternalId(['pta', name, primaryEmail, primaryPhone, company]),
      name,
      emails,
      phones,
      primaryEmail,
      primaryPhone,
      company: company || null,
      country: countryToIso(r.Country || 'Pakistan'),
      tags,
      segmentFile: 'pta',
      customAttributes: {
        alternate_emails: emails.filter((e) => e !== primaryEmail),
        alternate_phones: phones.filter((p) => p !== primaryPhone),
        license_no: license || undefined,
        region: region || undefined,
        source_files: sourceFiles ? sourceFiles.split(',').map((s) => s.trim()) : undefined,
        import_source: 'Master_Customer_Segments_PTA',
      },
    });
  }
  return { people, skipped };
}

function normalizePakistani(rows) {
  const people = [];
  const skipped = [];

  let ctx = {
    customerName: '',
    categoryKeywords: '',
    complimentaryApp: '',
    country: 'Pakistan',
  };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r['Customer Name']?.trim()) ctx.customerName = r['Customer Name'].trim();
    if (r['Category Keywords']?.trim()) ctx.categoryKeywords = r['Category Keywords'].trim();
    if (r['Complimentary App Exported']?.trim())
      ctx.complimentaryApp = r['Complimentary App Exported'].trim();
    if (r.Country?.trim()) ctx.country = r.Country.trim();

    const first = r['First Name']?.trim() || '';
    const last = r['Last Name']?.trim() || '';
    let name = cleanName(`${first} ${last}`.trim()) || cleanName(ctx.customerName);

    const emails = parseEmails(
      r['Email Address'],
      r['Email 1'],
      r['Email 2'],
      r['Email 3'],
      r['Email 4'],
      r['Email 5'],
      r['Email 6'],
    );
    const phones = parsePhones(r['Contact Number']);
    const linkedin = r['LinkedIn ID']?.trim() || '';
    const notes = r.Notes?.trim() || '';
    const location = r.Location?.trim() || '';

    const keywordTags = ctx.categoryKeywords
      ? ctx.categoryKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
          .map((k) => sanitizeTagName(`Category:${k}`))
      : [];
    if (ctx.complimentaryApp) keywordTags.push(sanitizeTagName(`App:${ctx.complimentaryApp}`));

    if (
      !hasUsefulData({
        name,
        emails,
        phones,
        company: ctx.customerName,
        linkedin,
        notes,
        keywords: ctx.categoryKeywords,
      })
    ) {
      skipped.push({ file: 'pakistani', row: i + 2, reason: 'name-only or empty', name });
      continue;
    }

    if (!name) {
      if (emails[0]) {
        const local = emails[0].split('@')[0].replace(/[._-]+/g, ' ');
        name = cleanName(local) || emails[0];
      } else {
        skipped.push({ file: 'pakistani', row: i + 2, reason: 'missing name' });
        continue;
      }
    }

    const tags = buildTags('pakistani', { country: ctx.country }, keywordTags);
    const primaryEmail = pickPrimaryEmail(emails);
    const primaryPhone = pickPrimaryPhone(phones, ctx.country);

    people.push({
      externalId: hashExternalId(['pk', name, primaryEmail, primaryPhone, ctx.customerName]),
      name,
      emails,
      phones,
      primaryEmail,
      primaryPhone,
      company: ctx.customerName || null,
      country: countryToIso(ctx.country),
      tags,
      segmentFile: 'pakistani',
      customAttributes: {
        alternate_emails: emails.filter((e) => e !== primaryEmail),
        alternate_phones: phones.filter((p) => p !== primaryPhone),
        company_name: ctx.customerName || undefined,
        linkedin_url: linkedin || undefined,
        location: location || undefined,
        category_keywords: ctx.categoryKeywords || undefined,
        complimentary_app: ctx.complimentaryApp || undefined,
        import_source: 'Master_Customer_Segments_Pakistani',
      },
    });
  }
  return { people, skipped };
}

function normalizeInternational(rows) {
  const people = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const first = r['First Name']?.trim() || '';
    const last = r['Last Name']?.trim() || '';
    let name =
      cleanName(`${first} ${last}`.trim()) || cleanName(r['Customer Name']);

    const emails = parseEmails(r['Email Address']);
    const phones = parsePhones(r['Phone Number']);
    const company = r['Customer Name']?.trim() || '';
    const vertical = r.Vertical?.trim() || '';
    const notes = r.Notes?.trim() || '';
    const country = r.Country?.trim() || r['Country Code']?.trim() || '';
    const confidence = r.Confidence?.trim() || '';
    const playStore = r['Play Store/Apple Store']?.trim() || '';

    const extraTags = [];
    if (vertical) extraTags.push(sanitizeTagName(`Vertical:${vertical}`));
    if (confidence) extraTags.push(sanitizeTagName(`Confidence:${confidence}`));

    if (
      !hasUsefulData({
        name,
        emails,
        phones,
        company,
        notes,
        vertical,
      })
    ) {
      skipped.push({ file: 'international', row: i + 2, reason: 'name-only or empty', name });
      continue;
    }

    if (!name) {
      if (emails[0]) {
        const local = emails[0].split('@')[0].replace(/[._-]+/g, ' ');
        name = cleanName(local) || emails[0];
      } else {
        skipped.push({ file: 'international', row: i + 2, reason: 'missing name' });
        continue;
      }
    }

    const tags = buildTags('international', { country }, extraTags);
    const primaryEmail = pickPrimaryEmail(emails);
    const primaryPhone = pickPrimaryPhone(phones, country);

    people.push({
      externalId: hashExternalId(['intl', name, primaryEmail, primaryPhone, company]),
      name,
      emails,
      phones,
      primaryEmail,
      primaryPhone,
      company: company || null,
      country: countryToIso(country) || (r['Country Code']?.trim().toUpperCase() || null),
      tags,
      segmentFile: 'international',
      customAttributes: {
        alternate_emails: emails.filter((e) => e !== primaryEmail),
        alternate_phones: phones.filter((p) => p !== primaryPhone),
        vertical: vertical || undefined,
        play_store_url: playStore || undefined,
        confidence: confidence || undefined,
        notes: notes || undefined,
        import_source: 'Master_Customer_Segments_International',
      },
    });
  }
  return { people, skipped };
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function resolveFlowChatAccountId(sql) {
  if (process.env.FLOWCHAT_ACCOUNT_ID) return process.env.FLOWCHAT_ACCOUNT_ID;
  const apiKey = process.env.FLOWCHAT_API_KEY;
  if (apiKey?.startsWith('fc_live_')) {
    const hash = createHash('sha256').update(apiKey).digest('hex');
    const rows = await sql`
      SELECT account_id as "accountId" FROM account_api_keys
      WHERE key_hash = ${hash} AND enabled = true LIMIT 1
    `;
    if (rows[0]?.accountId) return rows[0].accountId;
  }
  const fallback = await sql`SELECT id FROM accounts ORDER BY created_at ASC LIMIT 1`;
  return fallback[0]?.id;
}

async function resolveWaAccount(supabase) {
  if (process.env.WA_ACCOUNT_ID) return process.env.WA_ACCOUNT_ID;
  const { data } = await supabase.from('accounts').select('id').limit(1).maybeSingle();
  return data?.id;
}

async function resolveWaOwnerUserId(supabase, accountId) {
  const { data } = await supabase
    .from('accounts')
    .select('owner_user_id')
    .eq('id', accountId)
    .maybeSingle();
  return data?.owner_user_id;
}

async function ensureLabel(sql, accountId, name) {
  const rows = await sql`
    INSERT INTO labels (account_id, name, color)
    VALUES (${accountId}::uuid, ${name}, '#3b82f6')
    ON CONFLICT (account_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  return rows[0].id;
}

async function ensureStaticSegment(sql, accountId, name) {
  const existing = await sql`
    SELECT id FROM marketing_segments
    WHERE account_id = ${accountId}::uuid AND name = ${name} AND segment_type = 'static'
    LIMIT 1
  `;
  if (existing[0]?.id) return existing[0].id;
  const rows = await sql`
    INSERT INTO marketing_segments (account_id, name, segment_type, filters)
    VALUES (${accountId}::uuid, ${name}, 'static', '{}'::jsonb)
    RETURNING id
  `;
  return rows[0].id;
}

async function upsertFlowChatContact(sql, accountId, person) {
  const email = person.primaryEmail;
  const phone = person.primaryPhone;
  const customAttributes = JSON.stringify(person.customAttributes);

  const existing = await sql`
    SELECT id, custom_attributes as "customAttributes"
    FROM contacts
    WHERE account_id = ${accountId}::uuid AND external_id = ${person.externalId}
    LIMIT 1
  `;

  if (existing[0]) {
    const merged = {
      ...(existing[0].customAttributes || {}),
      ...person.customAttributes,
    };
    const rows = await sql`
      UPDATE contacts SET
        name = ${person.name},
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        country = COALESCE(${person.country}, country),
        custom_attributes = ${JSON.stringify(merged)}::jsonb,
        updated_at = NOW(),
        last_activity_at = NOW()
      WHERE id = ${existing[0].id}::uuid
      RETURNING id
    `;
    return { id: rows[0].id, created: false };
  }

  const byEmail = email
    ? await sql`
        SELECT id, custom_attributes as "customAttributes"
        FROM contacts WHERE account_id = ${accountId}::uuid AND email = ${email} LIMIT 1
      `
    : [];

  if (byEmail[0]) {
    const merged = {
      ...(byEmail[0].customAttributes || {}),
      ...person.customAttributes,
    };
    const rows = await sql`
      UPDATE contacts SET
        name = ${person.name},
        phone = COALESCE(${phone}, phone),
        external_id = ${person.externalId},
        country = COALESCE(${person.country}, country),
        custom_attributes = ${JSON.stringify(merged)}::jsonb,
        updated_at = NOW()
      WHERE id = ${byEmail[0].id}::uuid
      RETURNING id
    `;
    return { id: rows[0].id, created: false };
  }

  const rows = await sql`
    INSERT INTO contacts (account_id, name, email, phone, type, external_id, country, custom_attributes, last_activity_at)
    VALUES (
      ${accountId}::uuid,
      ${person.name},
      ${email},
      ${phone},
      'lead',
      ${person.externalId},
      ${person.country},
      ${customAttributes}::jsonb,
      NOW()
    )
    RETURNING id
  `;
  return { id: rows[0].id, created: true };
}

async function assignContactLabels(sql, contactId, labelIds) {
  if (!labelIds.length) return;
  const values = labelIds.map((labelId) => [contactId, labelId]);
  // Batch insert all labels for this contact in one round-trip
  for (const labelId of labelIds) {
    await sql`
      INSERT INTO contact_labels (contact_id, label_id)
      VALUES (${contactId}::uuid, ${labelId}::uuid)
      ON CONFLICT DO NOTHING
    `;
  }
}

async function runPool(items, concurrency, fn) {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

async function addSegmentMember(sql, segmentId, contactId) {
  await sql`
    INSERT INTO marketing_segment_members (segment_id, contact_id)
    VALUES (${segmentId}::uuid, ${contactId}::uuid)
    ON CONFLICT DO NOTHING
  `;
}

async function ensureWaTag(supabase, accountId, userId, name) {
  const { data: existing } = await supabase
    .from('tags')
    .select('id, name')
    .eq('account_id', accountId)
    .ilike('name', name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('tags')
    .insert({ account_id: accountId, user_id: userId, name, color: '#3b82f6' })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

async function upsertWaContact(supabase, accountId, userId, person, phone, flowchatContactId, tagIds) {
  const normalized = phone.replace(/\D/g, '');
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('account_id', accountId)
    .eq('phone_normalized', normalized)
    .maybeSingle();

  let contactId;
  if (existing) {
    const { data: updated, error } = await supabase
      .from('contacts')
      .update({
        name: person.name,
        email: person.primaryEmail,
        company: person.company,
        flowchat_contact_id: flowchatContactId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    contactId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        user_id: userId,
        name: person.name,
        phone,
        email: person.primaryEmail,
        company: person.company,
        flowchat_contact_id: flowchatContactId,
      })
      .select('id')
      .single();
    if (error) throw error;
    contactId = created.id;
  }

  if (tagIds.length) {
    const rows = tagIds.map((tag_id) => ({ contact_id: contactId, tag_id }));
    await supabase.from('contact_tags').upsert(rows, {
      onConflict: 'contact_id,tag_id',
      ignoreDuplicates: true,
    });
  }

  return { id: contactId, created: !existing };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE IMPORT ===');
  console.log('CSV dir:', CSV_DIR);

  const pta = readCsv(CSV_FILES.pta);
  const pk = readCsv(CSV_FILES.pakistani);
  const intl = readCsv(CSV_FILES.international);

  const ptaR = normalizePta(pta.rows);
  const pkR = normalizePakistani(pk.rows);
  const intlR = normalizeInternational(intl.rows);

  const people = [...ptaR.people, ...pkR.people, ...intlR.people];
  const skipped = [...ptaR.skipped, ...pkR.skipped, ...intlR.skipped];

  // Dedupe people by externalId (last wins)
  const byExt = new Map();
  for (const p of people) byExt.set(p.externalId, p);
  const uniquePeople = [...byExt.values()];

  const waRows = [];
  for (const p of uniquePeople) {
    if (p.phones.length === 0) continue;
    for (const phone of p.phones) {
      waRows.push({ person: p, phone });
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, 'normalized-summary.json'),
    JSON.stringify(
      {
        flowchatContacts: uniquePeople.length,
        waContacts: waRows.length,
        skipped: skipped.length,
        withPhone: uniquePeople.filter((p) => p.phones.length).length,
        emailOnly: uniquePeople.filter((p) => !p.phones.length && p.emails.length).length,
      },
      null,
      2,
    ),
  );
  writeFileSync(join(OUT_DIR, 'skipped.json'), JSON.stringify(skipped, null, 2));

  console.log('Parsed:', {
    flowchatContacts: uniquePeople.length,
    waPhoneRows: waRows.length,
    skipped: skipped.length,
  });

  if (DRY_RUN) {
    console.log('Dry run complete. See', OUT_DIR);
    return;
  }

  if (!FLOWCHAT_DATABASE_URL) throw new Error('FLOWCHAT_DATABASE_URL / DATABASE_URL required');
  if (!WA_SUPABASE_URL || !WA_SERVICE_KEY) {
    throw new Error('WA_SUPABASE_URL and WA_SUPABASE_SERVICE_ROLE_KEY required');
  }

  const sql = neon(FLOWCHAT_DATABASE_URL);
  const createClient = loadSupabase();
  const supabase = createClient(WA_SUPABASE_URL, WA_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const flowchatAccountId = await resolveFlowChatAccountId(sql);
  const waAccountId = await resolveWaAccount(supabase);
  const waUserId = await resolveWaOwnerUserId(supabase, waAccountId);

  if (!flowchatAccountId) throw new Error('Could not resolve FlowChat account_id');
  if (!waAccountId || !waUserId) throw new Error('Could not resolve WA account/user');

  console.log('Accounts:', { flowchatAccountId, waAccountId });

  // Tags / labels
  const allTagNames = new Set();
  for (const p of uniquePeople) for (const t of p.tags) allTagNames.add(t);

  const labelIdByName = new Map();
  for (const name of allTagNames) {
    const safe = sanitizeTagName(name);
    const id = await ensureLabel(sql, flowchatAccountId, safe);
    labelIdByName.set(name, id);
    labelIdByName.set(safe, id);
  }

  const waTagIdByName = new Map();
  for (const name of allTagNames) {
    const safe = sanitizeTagName(name);
    const id = await ensureWaTag(supabase, waAccountId, waUserId, safe);
    waTagIdByName.set(name, id);
    waTagIdByName.set(safe, id);
  }

  // Static segments
  const segmentIdByFile = {};
  for (const [key, segName] of Object.entries(SEGMENT_NAMES)) {
    segmentIdByFile[key] = await ensureStaticSegment(sql, flowchatAccountId, segName);
  }

  const stats = {
    flowchatCreated: 0,
    flowchatUpdated: 0,
    waCreated: 0,
    waUpdated: 0,
    segmentMembers: 0,
    errors: [],
  };

  const flowchatIdByExternal = new Map();

  await runPool(uniquePeople, 20, async (person) => {
    try {
      const { id, created } = await upsertFlowChatContact(sql, flowchatAccountId, person);
      flowchatIdByExternal.set(person.externalId, id);
      if (created) stats.flowchatCreated++;
      else stats.flowchatUpdated++;

      const labelIds = [...new Set(person.tags.map((t) => labelIdByName.get(t)).filter(Boolean))];
      await assignContactLabels(sql, id, labelIds);
      await addSegmentMember(sql, segmentIdByFile[person.segmentFile], id);
      stats.segmentMembers++;
    } catch (err) {
      stats.errors.push({ stage: 'flowchat', person: person.name, error: String(err) });
    }
  });
  console.log(`FlowChat done: ${uniquePeople.length} contacts`);

  await runPool(waRows, 25, async ({ person, phone }) => {
    try {
      const flowchatId = flowchatIdByExternal.get(person.externalId);
      const tagIds = [...new Set(person.tags.map((t) => waTagIdByName.get(t)).filter(Boolean))];
      const { created } = await upsertWaContact(
        supabase,
        waAccountId,
        waUserId,
        person,
        phone,
        flowchatId,
        tagIds,
      );
      if (created) stats.waCreated++;
      else stats.waUpdated++;
    } catch (err) {
      stats.errors.push({ stage: 'wa', person: person.name, phone, error: String(err) });
    }
  });
  console.log(`WA done: ${waRows.length} phone rows`);

  writeFileSync(join(OUT_DIR, 'import-results.json'), JSON.stringify(stats, null, 2));
  console.log('Import complete:', stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
