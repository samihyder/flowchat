#!/usr/bin/env node
/**
 * Normalize WA CRM tags on the FlowChat-linked Mutex account.
 *
 * Usage:
 *   node scripts/normalize-wa-tags.mjs --dry-run
 *   node scripts/normalize-wa-tags.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { normalizeWaTags } from './lib/wa-tag-normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DRY_RUN = process.argv.includes('--dry-run');

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

loadEnvFile(resolve(__dirname, '../../../.env'));
loadEnvFile(resolve(__dirname, '../../../.env.local'));
loadEnvFile(resolve(__dirname, '../../../../wa-automation/.env.local'));

const WA_SUPABASE_URL =
  process.env.WA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const WA_SERVICE_KEY =
  process.env.WA_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function loadSupabase() {
  const waRequire = createRequire(
    resolve(__dirname, '../../../../wa-automation/package.json'),
  );
  return waRequire('@supabase/supabase-js').createClient;
}

async function resolveWaAccount(supabase, sql, flowchatAccountId) {
  if (process.env.WA_ACCOUNT_ID) return process.env.WA_ACCOUNT_ID;

  const slugRow = flowchatAccountId
    ? await sql`
        SELECT slug FROM accounts WHERE id = ${flowchatAccountId}::uuid LIMIT 1
      `
    : [];
  const slug = slugRow[0]?.slug;
  if (slug) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, integration_settings, name');
    const match = (accounts ?? []).find((row) => {
      const settings = row.integration_settings ?? {};
      return settings.flowchat_account_id === slug;
    });
    if (match?.id) return match.id;
  }

  const { data } = await supabase.from('accounts').select('id').limit(1).maybeSingle();
  return data?.id;
}

async function resolveFlowChatAccountId(sql) {
  if (process.env.FLOWCHAT_ACCOUNT_ID) return process.env.FLOWCHAT_ACCOUNT_ID;
  const fallback = await sql`SELECT id FROM accounts ORDER BY created_at ASC LIMIT 1`;
  return fallback[0]?.id;
}

async function ensureTag(supabase, accountId, userId, name, cache) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('account_id', accountId)
    .ilike('name', name)
    .maybeSingle();
  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }

  if (DRY_RUN) {
    cache.set(key, `dry-${key}`);
    return cache.get(key);
  }

  const { data: created, error } = await supabase
    .from('tags')
    .insert({ account_id: accountId, user_id: userId, name, color: '#3b82f6' })
    .select('id')
    .single();
  if (error) throw error;
  cache.set(key, created.id);
  return created.id;
}

async function fetchAll(supabase, table, select, filterFn) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE NORMALIZE ===');

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.FLOWCHAT_DATABASE_URL || process.env.DATABASE_URL);
  const createClient = loadSupabase();
  const supabase = createClient(WA_SUPABASE_URL, WA_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const flowchatAccountId = await resolveFlowChatAccountId(sql);
  const waAccountId = await resolveWaAccount(supabase, sql, flowchatAccountId);
  const { data: account } = await supabase
    .from('accounts')
    .select('owner_user_id, name')
    .eq('id', waAccountId)
    .single();

  if (!account?.owner_user_id) throw new Error('WA account not found');
  console.log('Target:', { waAccountId, accountName: account.name });

  const tags = await fetchAll(supabase, 'tags', 'id, name', (q) =>
    q.eq('account_id', waAccountId),
  );
  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));

  const contacts = await fetchAll(supabase, 'contacts', 'id, name, company', (q) =>
    q.eq('account_id', waAccountId),
  );
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const contactIds = contacts.map((c) => c.id);

  const links = [];
  for (let i = 0; i < contactIds.length; i += 200) {
    const chunk = contactIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from('contact_tags')
      .select('contact_id, tag_id')
      .in('contact_id', chunk);
    if (error) throw error;
    links.push(...(data ?? []));
  }

  const tagsByContact = new Map();
  for (const link of links ?? []) {
    const contact = contactById.get(link.contact_id);
    if (!contact) continue;
    const tagName = tagNameById.get(link.tag_id);
    if (!tagName) continue;
    const list = tagsByContact.get(link.contact_id) ?? [];
    list.push(tagName);
    tagsByContact.set(link.contact_id, list);
  }

  const tagIdCache = new Map();
  const newRows = [];
  let contactsUpdated = 0;

  for (const [contactId, oldTags] of tagsByContact) {
    const contact = contactById.get(contactId);
    const ctdisrHint = [contact?.company, contact?.name].filter(Boolean).join(' ');
    const normalized = normalizeWaTags(oldTags, { ctdisrHint });
    if (!normalized.length) continue;
    contactsUpdated++;
    for (const name of normalized) {
      const tagId = await ensureTag(
        supabase,
        waAccountId,
        account.owner_user_id,
        name,
        tagIdCache,
      );
      if (!String(tagId).startsWith('dry-')) {
        newRows.push({ contact_id: contactId, tag_id: tagId });
      }
    }
  }

  const oldTagIds = tags.map((t) => t.id);
  console.log('Before:', {
    tagDefs: tags.length,
    contactTagLinks: links.length,
    contactsWithTags: tagsByContact.size,
  });

  if (!DRY_RUN) {
    const contactIds = [...tagsByContact.keys()];
    if (contactIds.length) {
      await supabase.from('contact_tags').delete().in('contact_id', contactIds);
    }

    const chunkSize = 500;
    for (let i = 0; i < newRows.length; i += chunkSize) {
      await supabase.from('contact_tags').upsert(newRows.slice(i, i + chunkSize), {
        onConflict: 'contact_id,tag_id',
        ignoreDuplicates: true,
      });
    }

    const keepIds = [...new Set(newRows.map((r) => r.tag_id))];
    const removeIds = oldTagIds.filter((id) => !keepIds.includes(id));
    if (removeIds.length) {
      await supabase.from('tags').delete().in('id', removeIds);
    }
  }

  const sampleNormalized = new Set();
  for (const [, oldTags] of [...tagsByContact.entries()].slice(0, 5)) {
    normalizeWaTags(oldTags).forEach((t) => sampleNormalized.add(t));
  }

  const { data: afterTags } = DRY_RUN
    ? { data: null }
    : await supabase
        .from('tags')
        .select('name')
        .eq('account_id', waAccountId)
        .order('name');

  console.log('Done:', {
    contactsUpdated,
    newAssignments: newRows.length,
    sampleNormalized: [...sampleNormalized],
    tagsAfterCount: afterTags?.length,
    tagsAfterSample: afterTags?.slice(0, 25).map((t) => t.name),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
