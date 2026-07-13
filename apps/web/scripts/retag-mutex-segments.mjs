#!/usr/bin/env node
/**
 * Rename legacy segment tags and sync FlowChat labels → Mutex WA tags.
 *
 * Usage:
 *   node scripts/retag-mutex-segments.mjs --dry-run
 *   node scripts/retag-mutex-segments.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

const TAG_RENAMES = {
  'Segment:PTA': 'PTA',
  'Segment:Pakistani': 'Pakistan Client',
  'Segment:International': 'International',
};

const IMPORT_SOURCE_TAG = {
  Master_Customer_Segments_PTA: 'PTA',
  Master_Customer_Segments_Pakistani: 'Pakistan Client',
  Master_Customer_Segments_International: 'International',
};

const DRY_RUN = process.argv.includes('--dry-run');

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

const FLOWCHAT_DATABASE_URL =
  process.env.FLOWCHAT_DATABASE_URL || process.env.DATABASE_URL;
const WA_SUPABASE_URL =
  process.env.WA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const WA_SERVICE_KEY =
  process.env.WA_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function resolveFlowChatAccountId(sql) {
  if (process.env.FLOWCHAT_ACCOUNT_ID) return process.env.FLOWCHAT_ACCOUNT_ID;
  const apiKey = process.env.FLOWCHAT_API_KEY;
  if (apiKey) {
    const rows = await sql`
      SELECT account_id as "accountId"
      FROM account_api_keys
      WHERE key_hash = encode(digest(${apiKey}, 'sha256'), 'hex')
      LIMIT 1
    `;
    if (rows[0]?.accountId) return rows[0].accountId;
  }
  const fallback = await sql`SELECT id FROM accounts ORDER BY created_at ASC LIMIT 1`;
  return fallback[0]?.id;
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
      .select('id, integration_settings');
    const match = (accounts ?? []).find((row) => {
      const settings = row.integration_settings ?? {};
      return settings.flowchat_account_id === slug;
    });
    if (match?.id) return match.id;
  }

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

async function renameFlowChatLabels(sql, accountId) {
  let renamed = 0;
  for (const [oldName, newName] of Object.entries(TAG_RENAMES)) {
    const existingNew = await sql`
      SELECT id FROM labels
      WHERE account_id = ${accountId}::uuid AND name = ${newName}
      LIMIT 1
    `;
    const existingOld = await sql`
      SELECT id FROM labels
      WHERE account_id = ${accountId}::uuid AND name = ${oldName}
      LIMIT 1
    `;
    if (!existingOld[0]?.id) continue;

    if (existingNew[0]?.id && existingNew[0].id !== existingOld[0].id) {
      if (!DRY_RUN) {
        await sql`
          INSERT INTO contact_labels (contact_id, label_id)
          SELECT contact_id, ${existingNew[0].id}::uuid
          FROM contact_labels
          WHERE label_id = ${existingOld[0].id}::uuid
          ON CONFLICT DO NOTHING
        `;
        await sql`DELETE FROM contact_labels WHERE label_id = ${existingOld[0].id}::uuid`;
        await sql`DELETE FROM labels WHERE id = ${existingOld[0].id}::uuid`;
      }
      renamed++;
      continue;
    }

    if (!DRY_RUN) {
      await sql`
        UPDATE labels SET name = ${newName}
        WHERE id = ${existingOld[0].id}::uuid
      `;
    }
    renamed++;
  }
  return renamed;
}

async function ensureFlowChatSegmentLabels(sql, accountId) {
  let added = 0;
  for (const [source, tagName] of Object.entries(IMPORT_SOURCE_TAG)) {
    const labelRows = await sql`
      INSERT INTO labels (account_id, name, color)
      VALUES (${accountId}::uuid, ${tagName}, '#3b82f6')
      ON CONFLICT (account_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const labelId = labelRows[0].id;

    if (DRY_RUN) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM contacts
        WHERE account_id = ${accountId}::uuid
          AND custom_attributes->>'import_source' = ${source}
      `;
      added += countRows[0]?.count ?? 0;
      continue;
    }

    const inserted = await sql`
      INSERT INTO contact_labels (contact_id, label_id)
      SELECT c.id, ${labelId}::uuid
      FROM contacts c
      WHERE c.account_id = ${accountId}::uuid
        AND c.custom_attributes->>'import_source' = ${source}
      ON CONFLICT DO NOTHING
      RETURNING contact_id
    `;
    added += inserted.length;
  }
  return added;
}

async function renameWaTags(supabase, accountId) {
  let renamed = 0;
  const { data: tags } = await supabase.from('tags').select('id, name').eq('account_id', accountId);

  for (const tag of tags ?? []) {
    const newName = TAG_RENAMES[tag.name];
    if (!newName) continue;

    const { data: conflict } = await supabase
      .from('tags')
      .select('id')
      .eq('account_id', accountId)
      .ilike('name', newName)
      .neq('id', tag.id)
      .maybeSingle();

    if (conflict?.id) {
      if (!DRY_RUN) {
        const { data: links } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .eq('tag_id', tag.id);
        const rows = (links ?? []).map((row) => ({
          contact_id: row.contact_id,
          tag_id: conflict.id,
        }));
        if (rows.length) {
          await supabase.from('contact_tags').upsert(rows, {
            onConflict: 'contact_id,tag_id',
            ignoreDuplicates: true,
          });
        }
        await supabase.from('contact_tags').delete().eq('tag_id', tag.id);
        await supabase.from('tags').delete().eq('id', tag.id);
      }
      renamed++;
      continue;
    }

    if (!DRY_RUN) {
      await supabase.from('tags').update({ name: newName }).eq('id', tag.id);
    }
    renamed++;
  }
  return renamed;
}

async function ensureWaTag(supabase, accountId, userId, name) {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('account_id', accountId)
    .ilike('name', name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from('tags')
    .insert({ account_id: accountId, user_id: userId, name, color: '#3b82f6' })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

async function syncWaTagsFromFlowChat(sql, supabase, waAccountId, waUserId) {
  const { data: waContacts } = await supabase
    .from('contacts')
    .select('id, flowchat_contact_id')
    .eq('account_id', waAccountId)
    .not('flowchat_contact_id', 'is', null);

  const flowchatIds = (waContacts ?? [])
    .map((row) => row.flowchat_contact_id)
    .filter(Boolean);
  if (!flowchatIds.length) return 0;

  const labelRows = await sql`
    SELECT cl.contact_id as "contactId", l.name
    FROM contact_labels cl
    INNER JOIN labels l ON l.id = cl.label_id
    WHERE cl.contact_id = ANY(${flowchatIds}::uuid[])
    ORDER BY l.name
  `;

  const labelsByContact = new Map();
  for (const row of labelRows) {
    const list = labelsByContact.get(row.contactId) ?? [];
    list.push(row.name);
    labelsByContact.set(row.contactId, list);
  }

  const allTagNames = new Set(['flowchat-sync']);
  for (const names of labelsByContact.values()) {
    for (const name of names) allTagNames.add(name);
  }

  const tagIdByName = new Map();
  for (const name of allTagNames) {
    if (DRY_RUN) {
      tagIdByName.set(name, `dry-${name}`);
      continue;
    }
    tagIdByName.set(name, await ensureWaTag(supabase, waAccountId, waUserId, name));
  }

  const rows = [];
  for (const waContact of waContacts ?? []) {
    const labelNames = labelsByContact.get(waContact.flowchat_contact_id) ?? [];
    const tagNames = [...new Set([...labelNames, 'flowchat-sync'])];
    for (const name of tagNames) {
      const tagId = tagIdByName.get(name);
      if (tagId) rows.push({ contact_id: waContact.id, tag_id: tagId });
    }
  }

  if (!DRY_RUN && rows.length) {
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from('contact_tags').upsert(chunk, {
        onConflict: 'contact_id,tag_id',
        ignoreDuplicates: true,
      });
    }
  }

  return waContacts?.length ?? 0;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RETAG ===');

  if (!FLOWCHAT_DATABASE_URL) throw new Error('FLOWCHAT_DATABASE_URL required');
  if (!WA_SUPABASE_URL || !WA_SERVICE_KEY) {
    throw new Error('WA_SUPABASE_URL and WA_SUPABASE_SERVICE_ROLE_KEY required');
  }

  const sql = neon(FLOWCHAT_DATABASE_URL);
  const createClient = loadSupabase();
  const supabase = createClient(WA_SUPABASE_URL, WA_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const flowchatAccountId = await resolveFlowChatAccountId(sql);
  const waAccountId = await resolveWaAccount(supabase, sql, flowchatAccountId);
  const waUserId = await resolveWaOwnerUserId(supabase, waAccountId);

  if (!flowchatAccountId || !waAccountId || !waUserId) {
    throw new Error('Could not resolve FlowChat / WA accounts');
  }

  console.log('Accounts:', { flowchatAccountId, waAccountId });

  const renamedLabels = await renameFlowChatLabels(sql, flowchatAccountId);
  const addedLabels = await ensureFlowChatSegmentLabels(sql, flowchatAccountId);
  const renamedTags = await renameWaTags(supabase, waAccountId);
  const syncedContacts = await syncWaTagsFromFlowChat(
    sql,
    supabase,
    waAccountId,
    waUserId,
  );

  console.log('Done:', {
    renamedLabels,
    addedLabels,
    renamedTags,
    syncedContacts,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
