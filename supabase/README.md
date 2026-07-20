# FlowChat → Supabase (Phase 1)

Project: `ozetivcvfszayotcimbw` (`https://ozetivcvfszayotcimbw.supabase.co`) · region `us-west-2`

## Status

| Step | Status |
|------|--------|
| Baseline schema (`APPLY_000`) | Applied — **62 tables** |
| App client (postgres.js) | Done — Neon HTTP removed |
| Local env settings | Propagated to root, web, API, WS, worker |
| Neon data import | Skipped (left behind by choice) |

## Settings (gitignored)

Copied from saved FlowChat credentials into:

- `.env` / `.env.local`
- `apps/web/.env.local`
- `services/api/.env`
- `services/ws/.env`
- `services/worker/.env`

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Transaction pooler `:6543` |
| `DIRECT_URL` | Session pooler `:5432` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ozetivcvfszayotcimbw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role |
| `SUPABASE_DB_PASSWORD` | DB password |

## Schema files

| File | Use |
|------|-----|
| `APPLY_000_flowchat_baseline.sql` | Full schema (already applied) |
| `migrations/20260720120000_flowchat_baseline.sql` | Same SQL for CLI |

Fresh DB only — do not re-run on this project (tables already exist).

## Tenants seeded

Two workspaces were created from WhatsApp CRM (wa-automation) settings:

| Slug | Owner | WA account | Notes |
|------|-------|------------|-------|
| `mutex-systems` | samihaider@mutexsystemsltd.com | `6cb4a28e-…` | WhatsApp connected · ~976 contacts |
| `nexus-corp` | hyder@nexuscorp-ltd.com | `5e9bb984-…` | ~22k contacts |

Mapping (no passwords): `tenant-mapping.json`  
Temp login passwords (gitignored): `TENANT_BOOTSTRAP.local.json`

Each tenant has: account + admin user + Website inbox + `account_integrations.whatsapp_crm`.
WA `integration_settings.flowchat_account_id` points back at FlowChat UUIDs.

## Contact sync (from WhatsApp CRM)

| Workspace | Contacts | Labels | Label links |
|-----------|----------|--------|-------------|
| `mutex-systems` | 976 | 81 | 4,176 |
| `nexus-corp` | 22,249 | 18 | 794 |

- FlowChat `contacts.external_id` = WA contact id (idempotent)
- Company / phone_normalized stored in `custom_attributes`
- WA tags → FlowChat labels; `contact_tags` → `contact_labels`
- WA `flowchat_contact_id` backfilled to new FlowChat UUIDs
- Report: `contact-sync-report.json`
- Re-run: `node scripts/sync-wa-contacts-to-flowchat.mjs`

## Sign-in

Use owner emails in `TENANT_BOOTSTRAP.local.json` (temp passwords). Change after first login.
