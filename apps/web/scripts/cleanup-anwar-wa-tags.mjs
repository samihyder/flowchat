#!/usr/bin/env node
/**
 * Strip all non-country tags from the Anwar Haider WA account and keep only
 * Country:* tags derived from phone dial codes.
 *
 * Usage:
 *   node scripts/cleanup-anwar-wa-tags.mjs --dry-run
 *   node scripts/cleanup-anwar-wa-tags.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ANWAR_ACCOUNT_ID =
  process.env.ANWAR_WA_ACCOUNT_ID || '5e9bb984-de38-4411-bcb7-e7587d41a2fa';
const DRY_RUN = process.argv.includes('--dry-run');

/** Longest-prefix first — dial digits (no +) → Country tag label. */
const DIAL_TO_COUNTRY = [
  ['971', 'United Arab Emirates'],
  ['966', 'Saudi Arabia'],
  ['974', 'Qatar'],
  ['968', 'Oman'],
  ['973', 'Bahrain'],
  ['965', 'Kuwait'],
  ['880', 'Bangladesh'],
  ['977', 'Nepal'],
  ['92', 'Pakistan'],
  ['91', 'India'],
  ['86', 'China'],
  ['81', 'Japan'],
  ['82', 'South Korea'],
  ['61', 'Australia'],
  ['64', 'New Zealand'],
  ['49', 'Germany'],
  ['44', 'United Kingdom'],
  ['41', 'Switzerland'],
  ['39', 'Italy'],
  ['34', 'Spain'],
  ['33', 'France'],
  ['46', 'Sweden'],
  ['90', 'Turkey'],
  ['1', 'United States'],
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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

loadEnvFile(resolve(__dirname, '../../../../wa-automation/.env.local'));

const WA_SUPABASE_URL =
  process.env.WA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const WA_SERVICE_KEY =
  process.env.WA_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function countryFromPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  for (const [prefix, country] of DIAL_TO_COUNTRY) {
    if (digits.startsWith(prefix)) return country;
  }
  return null;
}

function loadSupabase() {
  const waRequire = createRequire(
    resolve(__dirname, '../../../../wa-automation/package.json'),
  );
  return waRequire('@supabase/supabase-js').createClient;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE CLEANUP ===');
  console.log('Account:', ANWAR_ACCOUNT_ID);

  const createClient = loadSupabase();
  const supabase = createClient(WA_SUPABASE_URL, WA_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: account } = await supabase
    .from('accounts')
    .select('owner_user_id, name')
    .eq('id', ANWAR_ACCOUNT_ID)
    .single();
  if (!account?.owner_user_id) throw new Error('Anwar account not found');
  console.log('Account name:', account.name);

  const { data: allTags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('account_id', ANWAR_ACCOUNT_ID);

  const countryTags = (allTags ?? []).filter((t) => t.name.startsWith('Country:'));
  const nonCountryTags = (allTags ?? []).filter((t) => !t.name.startsWith('Country:'));
  console.log('Tags before:', {
    country: countryTags.length,
    other: nonCountryTags.length,
  });

  if (!DRY_RUN && nonCountryTags.length) {
    const nonCountryIds = nonCountryTags.map((t) => t.id);
    const chunkSize = 100;
    for (let i = 0; i < nonCountryIds.length; i += chunkSize) {
      const chunk = nonCountryIds.slice(i, i + chunkSize);
      await supabase.from('contact_tags').delete().in('tag_id', chunk);
    }
    await supabase.from('tags').delete().in('id', nonCountryIds);
  }

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, phone')
    .eq('account_id', ANWAR_ACCOUNT_ID)
    .not('phone', 'is', null);

  const tagIdByCountry = new Map();
  for (const t of countryTags) {
    tagIdByCountry.set(t.name.replace(/^Country:/, ''), t.id);
  }

  const rows = [];
  let inferred = 0;
  let skipped = 0;

  for (const contact of contacts ?? []) {
    const country = countryFromPhone(contact.phone);
    if (!country) {
      skipped++;
      continue;
    }
    inferred++;

    let tagId = tagIdByCountry.get(country);
    if (!tagId && !DRY_RUN) {
      const tagName = `Country:${country}`;
      const { data: created, error } = await supabase
        .from('tags')
        .insert({
          account_id: ANWAR_ACCOUNT_ID,
          user_id: account.owner_user_id,
          name: tagName,
          color: '#3b82f6',
        })
        .select('id')
        .single();
      if (error) {
        const { data: existing } = await supabase
          .from('tags')
          .select('id')
          .eq('account_id', ANWAR_ACCOUNT_ID)
          .eq('name', tagName)
          .maybeSingle();
        tagId = existing?.id;
      } else {
        tagId = created.id;
      }
      if (tagId) tagIdByCountry.set(country, tagId);
    }

    if (tagId) rows.push({ contact_id: contact.id, tag_id: tagId });
  }

  if (!DRY_RUN) {
    // Clear all country assignments first, then re-apply from phone codes only.
    const countryTagIds = [...tagIdByCountry.values()].filter(Boolean);
    if (countryTagIds.length) {
      await supabase.from('contact_tags').delete().in('tag_id', countryTagIds);
    }

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from('contact_tags').upsert(chunk, {
        onConflict: 'contact_id,tag_id',
        ignoreDuplicates: true,
      });
    }
  }

  const { data: afterTags } = await supabase
    .from('tags')
    .select('name')
    .eq('account_id', ANWAR_ACCOUNT_ID)
    .order('name');

  console.log('Done:', {
    removedTagDefs: nonCountryTags.length,
    contactsWithCountry: inferred,
    contactsSkipped: skipped,
    countryAssignments: rows.length,
    tagsAfter: afterTags?.map((t) => t.name),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
