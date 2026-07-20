/**
 * Sync WhatsApp CRM contacts → FlowChat Supabase for seeded tenants.
 *
 * Usage:
 *   cd apps/web && node ../../scripts/sync-wa-contacts-to-flowchat.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const webRequire = createRequire(join(ROOT, 'apps/web/package.json'));
const waRequire = createRequire('/Users/samihaider/Documents/GitHub/wa-automation/package.json');
const postgres = webRequire('postgres');
const { createClient } = waRequire('@supabase/supabase-js');

const PAGE = 500;
const LABEL_COLORS = ['#06B6D4', '#2DD4BF', '#6366F1', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function ensureCustomAttrs(sql, accountId) {
  const defs = [
    { key: 'company', label: 'Company', attrType: 'text', sortOrder: 10 },
    { key: 'wa_contact_id', label: 'WhatsApp CRM contact ID', attrType: 'text', sortOrder: 20 },
    { key: 'phone_normalized', label: 'Phone (normalized)', attrType: 'text', sortOrder: 30 },
  ];
  for (const d of defs) {
    await sql`
      INSERT INTO custom_attribute_definitions
        (account_id, entity_type, key, label, attr_type, sort_order)
      VALUES (${accountId}::uuid, 'contact', ${d.key}, ${d.label}, ${d.attrType}, ${d.sortOrder})
      ON CONFLICT (account_id, entity_type, key) DO NOTHING
    `;
  }
}

async function syncLabels(sql, wa, accountId, waAccountId) {
  const { data: tags, error } = await wa.from('tags').select('id,name').eq('account_id', waAccountId);
  if (error) throw new Error(`tags: ${error.message}`);
  const tagToLabel = new Map();
  let i = 0;
  for (const tag of tags ?? []) {
    const name = String(tag.name || '').trim().slice(0, 100);
    if (!name) continue;
    const color = LABEL_COLORS[i % LABEL_COLORS.length];
    i++;
    const rows = await sql`
      INSERT INTO labels (account_id, name, color)
      VALUES (${accountId}::uuid, ${name}, ${color})
      ON CONFLICT (account_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    tagToLabel.set(tag.id, rows[0].id);
  }
  console.log(`  labels: ${tagToLabel.size}`);
  return tagToLabel;
}

async function fetchAllWaContacts(wa, waAccountId) {
  const all = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE - 1;
    const { data, error } = await withRetry(
      () =>
        wa
          .from('contacts')
          .select('id,name,email,phone,phone_normalized,company,avatar_url,created_at,updated_at')
          .eq('account_id', waAccountId)
          .order('created_at', { ascending: true })
          .range(from, to),
      `contacts[${from}-${to}]`,
    );
    if (error) throw new Error(`contacts page ${from}: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function upsertContacts(sql, accountId, contacts) {
  const idMap = new Map();
  let done = 0;
  for (const batch of chunk(contacts, 200)) {
    const externalIds = batch.map((c) => c.id);
    const existing = await sql`
      SELECT id, external_id FROM contacts
      WHERE account_id = ${accountId}::uuid
        AND external_id = ANY(${externalIds}::text[])
    `;
    const byExt = new Map(existing.map((r) => [r.external_id, r.id]));

    const updates = [];
    const inserts = [];
    for (const c of batch) {
      const name = (c.name || c.phone || 'Unknown').toString().slice(0, 255);
      const email = c.email ? String(c.email).toLowerCase().slice(0, 255) : null;
      const phone = c.phone ? String(c.phone).slice(0, 50) : null;
      const attrs = {
        company: c.company ?? null,
        wa_contact_id: c.id,
        phone_normalized: c.phone_normalized ?? null,
      };
      const existingId = byExt.get(c.id);
      if (existingId) {
        updates.push({ existingId, name, email, phone, avatar: c.avatar_url ?? null, attrs });
        idMap.set(c.id, existingId);
      } else {
        inserts.push({
          account_id: accountId,
          name,
          email,
          phone,
          type: 'customer',
          avatar_url: c.avatar_url ?? null,
          external_id: c.id,
          custom_attributes: attrs,
          created_at: c.created_at ?? new Date().toISOString(),
          updated_at: c.updated_at ?? new Date().toISOString(),
          last_activity_at: c.updated_at ?? null,
        });
      }
    }

    // Parallel updates (bounded)
    for (const uBatch of chunk(updates, 25)) {
      await Promise.all(
        uBatch.map((u) =>
          sql`
            UPDATE contacts SET
              name = ${u.name},
              email = COALESCE(${u.email}, email),
              phone = COALESCE(${u.phone}, phone),
              avatar_url = COALESCE(${u.avatar}, avatar_url),
              custom_attributes = custom_attributes || ${sql.json(u.attrs)},
              updated_at = NOW()
            WHERE id = ${u.existingId}::uuid
          `,
        ),
      );
    }

    if (inserts.length) {
      const inserted = await sql`
        INSERT INTO contacts ${sql(
          inserts,
          'account_id',
          'name',
          'email',
          'phone',
          'type',
          'avatar_url',
          'external_id',
          'custom_attributes',
          'created_at',
          'updated_at',
          'last_activity_at',
        )}
        RETURNING id, external_id
      `;
      for (const row of inserted) idMap.set(row.external_id, row.id);
    }

    done += batch.length;
    if (done % 1000 === 0 || done === contacts.length) {
      console.log(`  … ${done}/${contacts.length}`);
    }
  }
  return idMap;
}

async function withRetry(fn, label, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const wait = 500 * 2 ** i;
      console.log(`  retry ${label} (${i + 1}/${attempts}) after ${wait}ms: ${err.message}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

async function syncContactLabels(sql, wa, idMap, tagToLabel, waContactIds) {
  let linked = 0;
  const pairs = [];
  for (const batch of chunk(waContactIds, 80)) {
    const { data: rows, error } = await withRetry(
      () => wa.from('contact_tags').select('contact_id,tag_id').in('contact_id', batch),
      `contact_tags[${batch.length}]`,
    );
    if (error) throw new Error(`contact_tags: ${error.message}`);
    for (const row of rows ?? []) {
      const fcContactId = idMap.get(row.contact_id);
      const labelId = tagToLabel.get(row.tag_id);
      if (!fcContactId || !labelId) continue;
      pairs.push({ contact_id: fcContactId, label_id: labelId });
    }
  }
  for (const batch of chunk(pairs, 400)) {
    if (!batch.length) continue;
    await sql`
      INSERT INTO contact_labels ${sql(batch, 'contact_id', 'label_id')}
      ON CONFLICT DO NOTHING
    `;
    linked += batch.length;
  }
  return linked;
}

async function writeBackWaFlowchatIds(wa, idMap) {
  let updated = 0;
  const entries = [...idMap.entries()];
  for (const batch of chunk(entries, 25)) {
    await withRetry(async () => {
      const results = await Promise.all(
        batch.map(([waId, fcId]) =>
          wa.from('contacts').update({ flowchat_contact_id: fcId }).eq('id', waId),
        ),
      );
      for (const r of results) {
        if (r.error) throw new Error(r.error.message);
      }
    }, `wa-backfill[${updated}]`);
    updated += batch.length;
    if (updated % 2000 === 0 || updated === entries.length) {
      console.log(`  … WA backfill ${updated}/${entries.length}`);
    }
  }
  return updated;
}

async function syncTenant(sql, wa, tenant) {
  console.log(`\n=== ${tenant.flowchat_slug} ===`);
  const accountId = tenant.flowchat_account_id;
  const waAccountId = tenant.wa_account_id;

  await ensureCustomAttrs(sql, accountId);
  const tagToLabel = await syncLabels(sql, wa, accountId, waAccountId);

  console.log('  fetching WA contacts…');
  const contacts = await fetchAllWaContacts(wa, waAccountId);
  console.log(`  fetched ${contacts.length}`);

  console.log('  upserting into FlowChat…');
  const idMap = await upsertContacts(sql, accountId, contacts);
  console.log(`  upserted ${idMap.size}`);

  console.log('  linking labels…');
  const linked = await syncContactLabels(sql, wa, idMap, tagToLabel, [...idMap.keys()]);
  console.log(`  contact_labels linked: ${linked}`);

  console.log('  writing flowchat_contact_id back to WA…');
  const written = await writeBackWaFlowchatIds(wa, idMap);
  console.log(`  WA backfill: ${written}`);

  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM contacts WHERE account_id = ${accountId}::uuid
  `;

  await sql`
    UPDATE accounts
    SET settings = settings || ${sql.json({
      contact_sync: {
        source: 'wa-automation',
        synced_at: new Date().toISOString(),
        contact_count: count,
        label_count: tagToLabel.size,
        label_links: linked,
      },
    })},
    updated_at = NOW()
    WHERE id = ${accountId}::uuid
  `;

  return { slug: tenant.flowchat_slug, contacts: count, labels: tagToLabel.size, labelLinks: linked };
}

async function main() {
  const fc = loadEnv(join(ROOT, '.env'));
  const waEnv = loadEnv(join(ROOT, '../wa-automation/.env.local'));
  const mapping = JSON.parse(readFileSync(join(ROOT, 'supabase/tenant-mapping.json'), 'utf8'));

  const sql = postgres(fc.DIRECT_URL || fc.DATABASE_URL, {
    prepare: false,
    ssl: 'require',
    max: 3,
    idle_timeout: 20,
  });
  const wa = createClient(waEnv.NEXT_PUBLIC_SUPABASE_URL, waEnv.SUPABASE_SERVICE_ROLE_KEY);

  const results = [];
  for (const tenant of mapping.tenants) {
    results.push(await syncTenant(sql, wa, tenant));
  }

  const summary = { finishedAt: new Date().toISOString(), results };
  writeFileSync(join(ROOT, 'supabase/contact-sync-report.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('\nSUMMARY', summary);
  await sql.end({ timeout: 2 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
