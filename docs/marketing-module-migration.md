# FlowChat — S6M Marketing Campaign Database Migration (Planned)

**Epic:** S6M — Marketing Campaign Redesign  
**Status:** Specification only — apply when backend implementation starts  
**Related:** [marketing-module-screens.md](marketing-module-screens.md) §1.2, §1.3, §7.1

---

## Overview

S6M introduces a **campaign-centric** model alongside (or replacing) legacy broadcast/workflow tables from migrations `0013`–`0016`. This document defines the target schema for new campaign wizard flows.

Legacy tables (`marketing_workflows`, workflow enrollments, etc.) remain until S6M-9 removes triggers and S6M-35 retires the UI; new code should write to the tables below.

---

## Tables

### `marketing_campaigns`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Assigned on draft create (S6M-1) |
| `account_id` | uuid FK | Tenant scope |
| `name` | text | Editable in wizard header |
| `status` | enum | `draft`, `scheduled`, `running`, `paused`, `completed`, `cancelled` |
| `current_step` | smallint | Wizard progress 1–4 (draft only) |
| `created_by` | uuid FK users | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `launched_by` | uuid FK users nullable | S6M-3 |
| `launched_at` | timestamptz nullable | |
| `paused_at` | timestamptz nullable | S6M-4 |
| `cancelled_at` | timestamptz nullable | |
| `test_sent_at` | timestamptz nullable | S6M-23 |
| `test_sent_by` | uuid FK users nullable | |
| `test_sent_to` | text nullable | Email address |
| `from_name` | text nullable | Step 3 sender |
| `from_email` | text nullable | |
| `reply_to` | text nullable | |
| `signature_html` | text nullable | |
| `use_workspace_signature` | boolean default true | |
| `meeting_link` | text nullable | |
| `portfolio_link` | text nullable | |
| `credential_id` | uuid FK nullable | BYOK route (S7B) |

**Computed at read (not stored):** `test_valid` — true when `test_sent_at` set and step 1 + sender unchanged since (see §1.3 screens doc).

---

### `marketing_campaign_steps`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `step_order` | smallint | 1..N |
| `send_at` | timestamptz | Agent-selected datetime (UTC) |
| `subject` | text | |
| `html_body` | text | |
| `plain_body` | text nullable | Auto from HTML; editable |
| `merge_config` | jsonb | `{ "contact_message_mode": "latest_note" \| "latest_inbound_chat" \| "latest_note_or_chat" }` |
| `save_as_template` | boolean default false | S6M-13 |
| `template_name` | text nullable | If save_as_template |
| `snapshot_at` | timestamptz nullable | Set at launch (S6M-14) |
| `source_template_id` | uuid FK nullable | Provenance only |

At **launch**, copy subject/html/plain into immutable snapshot columns or set `snapshot_at` and lock edits.

---

### `marketing_campaign_recipients`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `contact_id` | uuid FK | |
| `email` | text | Denormalized at enroll |
| `stopped_reason` | enum nullable | `bounce`, `unsubscribe`, `reply`, `complaint` |
| `stopped_at` | timestamptz nullable | |
| `enrolled_at` | timestamptz | |

Unique: `(campaign_id, contact_id)`.

---

### `marketing_campaign_recipient_steps`

Per-recipient per-step send state.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `campaign_step_id` | uuid FK | |
| `recipient_id` | uuid FK | → `marketing_campaign_recipients` |
| `status` | enum | See §1.2 in marketing-module-screens.md |
| `scheduled_at` | timestamptz | Copy of step `send_at` at launch |
| `sent_at` | timestamptz nullable | |
| `provider_message_id` | text nullable | For reply-stop matching (S6M-38) |
| `retry_count` | smallint default 0 | Soft bounce retries (S6M-36) |
| `last_error_code` | text nullable | MarketingError code, not raw provider JSON |
| `updated_at` | timestamptz | |

Unique: `(recipient_id, campaign_step_id)` — idempotent send guard (S6M-33, S6M-42).

---

### `marketing_campaign_activity` (optional v1 table)

If activity log is not derived from events only:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `recipient_id` | uuid FK nullable | |
| `step_id` | uuid FK nullable | |
| `event_type` | text | `send_attempt`, `webhook`, `skip`, `complaint`, `error` |
| `payload` | jsonb | Sanitized summary only |
| `created_at` | timestamptz | |

Alternatively: build activity from `marketing_campaign_recipient_steps` + webhook event log (S6M-26).

---

## Indexes

| Index | Purpose |
|-------|---------|
| `(account_id, status)` on campaigns | List filters (S6M-2) |
| `(campaign_id, step_order)` on steps | Wizard + stats |
| `(send_at)` on recipient_steps where status = pending | Cron due query (S6M-33) |
| `(provider_message_id)` on recipient_steps | Reply-stop lookup (S6M-38) |
| `(campaign_id, stopped_reason)` on recipients | Stats filters (S6M-28) |

---

## Cron query (S6M-33)

```sql
-- Pseudocode: due sends
SELECT crs.*
FROM marketing_campaign_recipient_steps crs
JOIN marketing_campaign_recipients cr ON cr.id = crs.recipient_id
JOIN marketing_campaigns c ON c.id = crs.campaign_id
WHERE c.status IN ('scheduled', 'running')
  AND crs.status = 'pending'
  AND crs.scheduled_at <= now()
  AND cr.stopped_reason IS NULL;
```

---

## Migration strategy

1. **0022_s6m_campaigns.sql** (suggested) — create tables above; no drop of legacy workflow tables yet.
2. **Implement S6M API** — dual-write not required; new wizard uses new tables only.
3. **S6M-9** — remove `triggerMarketingWorkflows`; stop new workflow enrollments.
4. **S6M-35** — hide workflow UI; optional later migration to archive legacy workflow data.

---

## Enums reference

See [marketing-module-screens.md §1.2](marketing-module-screens.md) for canonical `stopped_reason` ↔ step `status` mapping.

---

*Last updated: 2026-06-13 · Planned with S6M spec lock*
