# S6M Marketing Module — Sprint-Ordered Implementation Checklist

**Epic:** S6M · **Approach:** Vertical slices (migration → API → UI per slice)  
**Environment:** **Local development only** until full epic QA sign-off  
**Spec:** [marketing-module-screens.md](marketing-module-screens.md) · [marketing-module-migration.md](marketing-module-migration.md)  
**Stitch root:** `stitch_flow_marketing_module_design_system/`  
**Design tokens:** `stitch_flow_marketing_module_design_system/flowchat_campaign_system/DESIGN.md`  
**DoD:** [email-marketing-standard.md](email-marketing-standard.md) · QA §9 in [marketing-module-screens.md](marketing-module-screens.md#9-qa-checklist-development)

> **Canonical Stitch screens** — prefer `*_refined` / `*_with_stop_metrics` over legacy duplicates.  
> Rename **SalesHub → FlowChat** in HTML at implementation time.

---

## Development policy (locked)

1. **Build locally** — all code, migrations, and tests run on a developer machine before any deploy.
2. **QA after every sub-sprint** — do **not** start the next sub-sprint until the current one’s QA gate passes (UI + API + DB).
3. **Three-layer testing** — every gate requires evidence in all three layers (see below).
4. **No mock-only merges** — UI must call real local API; API must persist to local PostgreSQL.

---

## Local development setup

From repo root (`FlowChat/`):

```bash
# One-time (see docs/MUTEX_SYSTEMS_SETUP.md)
cp .env.example .env.local   # DATABASE_URL, JWT_SECRET, REDIS_URL, provider keys
pnpm install
pnpm db:migrate              # apply 0022_s6m_campaigns.sql when added

# Daily
pnpm dev                     # turbo: web + api + worker (ports per .env)
pnpm db:studio               # inspect rows (Drizzle Studio)
```

| Service | Typical local URL |
|---------|-------------------|
| Web app | `http://localhost:3100` or `http://localhost:4000` (see setup doc) |
| API | `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`) |
| PostgreSQL | `DATABASE_URL` in `.env.local` |

**Test accounts (create in local DB):** one **administrator**, one **agent** — required for RBAC QA from 6M-5 onward.

---

## QA protocol — run after **every** sub-sprint

### Standard commands (all sprints)

```bash
pnpm typecheck          # no TS errors
pnpm lint               # biome clean
pnpm test               # unit + integration for touched packages
pnpm db:migrate         # confirm migration applied (if schema changed)
```

### Three layers (all required)

| Layer | What to verify | How |
|-------|----------------|-----|
| **DB** | Rows, enums, FKs, indexes match [marketing-module-migration.md](marketing-module-migration.md) | `pnpm db:studio` or `psql` — inspect tables after each API action |
| **API** | Status codes, RBAC, validation, response shape per §7.1 | `curl`/HTTPie/REST client against **local** API; agent vs admin tokens |
| **UI** | Screen matches Stitch reference; happy path + one error path | Manual in local browser; compare to `stitch_flow_marketing_module_design_system/<folder>` |

### Universal UI checks (every sprint with UI changes)

- [ ] Loading and empty states render (no blank screens)
- [ ] Error toasts are human-readable (S6M-31) — not raw API errors
- [ ] Keyboard: stepper/tabs focusable; modals trap focus
- [ ] Mobile width (~390px): scrollable wizard/composer where applicable (S6M-40)
- [ ] Status badges use design tokens (`flowchat_campaign_system/DESIGN.md`)

### Universal API checks (every sprint with API changes)

- [ ] `401` without session · `403` when agent hits admin-only route
- [ ] `400` returns `{ code, message }` with safe `message` (no stack traces)
- [ ] Tenant isolation: account A cannot read account B campaign id
- [ ] Idempotent retries where specified (send engine, 6M-9+)

### Universal DB checks (every sprint with schema/data changes)

- [ ] Migration applies cleanly on fresh local DB
- [ ] `created_at` / `updated_at` populated
- [ ] Enum values match §1.2 in screens doc (no free-text status in DB)
- [ ] Rollback plan noted if migration is destructive

### Sign-off block (copy per sprint)

```
Sub-sprint: 6M-__
Date: ____
Developer: ____
DB:    [ ] pass  Notes: ____
API:   [ ] pass  Notes: ____
UI:    [ ] pass  Stitch ref: ____
pnpm typecheck/lint/test: [ ] pass
Ready for next sprint: [ ] YES
```

---

## How to use this doc

Each sub-sprint is one **shippable vertical slice**. Complete in order:

1. Migration / schema (if needed) — **local DB only**
2. API routes + server validation — test with curl before UI
3. React routes wired to **real** local API (no long-lived mocks)
4. Stitch screen as layout reference
5. **Run QA gate** (UI + API + DB) — **block next sprint until pass**

**API base:** `/api/accounts/[accountId]/marketing/campaigns` (see screens doc §7.1)

---

## Sprint 6M-0 · Foundation

**Goal:** Schema, types, nav cleanup, remove CRM workflow triggers.

| Stories | S6M-9, S6M-35, S6M-31 (partial), S6M-33 (schema only) |
|---------|--------------------------------------------------------|

### Migration
- [ ] Apply `0022_s6m_campaigns.sql` per [marketing-module-migration.md](marketing-module-migration.md)
- [ ] Enums: `campaign.status`, `stopped_reason`, `recipient_step.status` (§1.2 screens doc)
- [ ] Indexes: `(account_id, status)`, cron due query, `provider_message_id`

### API / platform
- [ ] Shared `MarketingError` codes + safe user messages (S6M-31)
- [ ] RBAC helper: `canLaunch`, `canControlCampaign` (§8)
- [ ] Remove / gate `triggerMarketingWorkflows` on contact create, import, chat (S6M-9)
- [ ] Nav: Marketing → **Campaigns | Templates** only; hide `/marketing/workflows` (S6M-35)

### UI shell (no business logic yet)
- [ ] Route scaffold: `/dashboard/marketing/campaigns`, `/templates`, wizard `/campaigns/[id]/edit`
- [ ] Tailwind tokens from `flowchat_campaign_system/DESIGN.md`

### Stitch reference
| Purpose | Folder |
|---------|--------|
| Nav chrome | Any wizard screen sidebar (e.g. `campaign_wizard_recipients`) |

### QA gate — required before 6M-1

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `marketing_campaigns` table exists · [ ] can `INSERT` draft row with `status=draft` · [ ] enums valid |
| **API** | [ ] N/A or health-only — no campaign routes yet |
| **UI** | [ ] Nav shows Campaigns + Templates only · [ ] `/marketing/workflows` hidden/404 · [ ] wizard route loads shell |

**Functional:** [ ] Create local CRM contact → **zero** rows in `marketing_campaign_recipients` / no send queue (S6M-9)

---

## Sprint 6M-1 · Campaign list + draft create (Slice 1)

**Goal:** Create draft, list campaigns, empty state.

| Stories | S6M-1, S6M-2, S6M-39 (partial), S6M-40 (partial) |
|---------|--------------------------------------------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/` | Create draft → `{ id, status: "draft", created_at, created_by }` (S6M-1) |
| `GET` | `/` | List with status filter, pagination (S6M-2) |
| `PATCH` | `/[id]` | `{ name?, current_step? }` — wizard resume (S6M-39) |

### UI
- [ ] Campaign list table + summary cards
- [ ] Empty state when zero campaigns
- [ ] “New campaign” → `POST /` → redirect to wizard step 1
- [ ] Wizard header: editable name, draft badge, **campaign ID + copy button** (S6M-1)
- [ ] Mobile list layout (S6M-40)

### Stitch reference
| Screen | Folder |
|--------|--------|
| Active list | `marketing_campaigns_list` |
| Empty state | `campaign_list_empty_state` |
| Mobile list | `campaign_list_mobile` |
| Wizard chrome (step 1) | `campaign_wizard_recipients` |

### QA gate — required before 6M-2

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `POST /` inserts row: `id`, `status=draft`, `created_by`, `created_at` · [ ] `account_id` scoped |
| **API** | [ ] `POST /` → `201` + body §7.1 · [ ] `GET /` paginated · [ ] `PATCH /[id]` updates `name`, `current_step` · [ ] `404` wrong id |
| **UI** | [ ] Empty state when 0 campaigns (`campaign_list_empty_state`) · [ ] List matches `marketing_campaigns_list` · [ ] New campaign → wizard step 1 · [ ] Campaign ID visible + copy · [ ] Mobile list (`campaign_list_mobile`) |

**Functional:** [ ] `?step=2` deep link restores step after PATCH · [ ] Draft badge on header

---

## Sprint 6M-2 · Recipients (Slice 2 — Wizard step 1)

**Goal:** Select contacts, segment import, suppression warnings.

| Stories | S6M-6, S6M-7, S6M-8, S6M-10 (preview only) |
|---------|---------------------------------------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `PUT` | `/[id]/recipients` | `{ contact_ids: [] }` → `{ selected, excluded: { suppressed, reasons } }` |
| `GET` | `/segments` (or existing) | Static segments for import (S6M-7) |

### UI
- [ ] CRM contact search + multi-select table
- [ ] “Import from segment” panel — merge into selection, no auto-enroll link (S6M-7)
- [ ] Suppressed/bounced/unsub badges on rows + top warning banner (S6M-8)
- [ ] Footer: Back disabled · Save draft · Next → step 2

### Stitch reference
| Screen | Folder |
|--------|--------|
| Step 1 recipients | `campaign_wizard_recipients` |
| Segments (optional admin) | `marketing_segments_management` |

### QA gate — required before 6M-3

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `marketing_campaign_recipients` rows for selected contacts · [ ] unique `(campaign_id, contact_id)` · [ ] suppressed contacts **not** inserted |
| **API** | [ ] `PUT /[id]/recipients` returns `excluded.suppressed` count · [ ] empty `contact_ids` allowed on draft · [ ] segment import merges IDs (S6M-7) |
| **UI** | [ ] Search + multi-select (`campaign_wizard_recipients`) · [ ] Suppression warning banner when suppressed selected (S6M-8) · [ ] Next → step 2 persists selection |

**Functional:** [ ] Reload wizard — recipient count unchanged · [ ] Segment import does not auto-enroll on future membership

---

## Sprint 6M-3 · Templates + composer (Slice 3)

**Goal:** Template library + full-screen editor building blocks.

| Stories | S6M-11, S6M-12, S6M-13, S6M-15, S6M-20 |
|---------|------------------------------------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `GET/POST/PATCH` | `/templates` | CRUD template library (S6M-11) |
| — | — | No attachment upload endpoints (S6M-20) |

### UI
- [ ] Template library grid + empty state
- [ ] Full-screen composer: subject, rich HTML body, merge chips rail (S6M-12, S6M-15)
- [ ] “Save as template” checkbox + name field (S6M-13)
- [ ] Plain-text advanced collapse (auto from HTML) (S6M-11)
- [ ] **No** attach-file control (S6M-20)

### Stitch reference
| Screen | Folder |
|--------|--------|
| Template library | `template_library` |
| Template empty | `template_library_empty_state` |
| Composer | `campaign_wizard_full_screen_composer` |
| Composer (motion) | `campaign_wizard_composer_with_motion` |

### QA gate — required before 6M-4

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `marketing_templates` (or equivalent) CRUD · [ ] no attachment columns/blob storage |
| **API** | [ ] Template CRUD · [ ] reject requests with `attachments` field · [ ] `plain_body` optional on save |
| **UI** | [ ] Library + empty (`template_library`, `template_library_empty_state`) · [ ] Composer full-screen (`campaign_wizard_full_screen_composer`) · [ ] Merge chips · [ ] Save-as-template · [ ] **No** attach button (S6M-20) |

**Functional:** [ ] Saved template appears in library · [ ] `{{first_name}}` chip inserts into body

---

## Sprint 6M-4 · Email sequence (Slice 4 — Wizard step 2)

**Goal:** Multi-step cards, schedule, bulk templates, message source, validation.

| Stories | S6M-16, S6M-17, S6M-18, S6M-19, S6M-41, R20 |
|---------|-----------------------------------------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `PUT` | `/[id]/steps` | Full step array + `merge_config.contact_message_mode` |
| `POST` | `/[id]/steps/bulk-from-templates` | Optional: bulk apply (or client expands then `PUT` steps) |

### UI
- [ ] Sequence timeline + per-step cards (date, time, subject, preview, open editor)
- [ ] “+ Add follow-up” default +3 days 09:00
- [ ] **Bulk add from templates** modal (S6M-16, R20)
- [ ] Message source modal on `{{contact_message}}` (S6M-19)
- [ ] Schedule validation errors UI (S6M-18)
- [ ] Merge `{{first_name}}` required validation UI (S6M-41)
- [ ] Invalidate `test_valid` when step 1 content changes (§1.3)

### Stitch reference
| Screen | Folder |
|--------|--------|
| Step 2 sequence | `campaign_wizard_sequence` |
| Step 2 (motion) | `campaign_wizard_sequence_with_motion` |
| Bulk templates modal | `campaign_wizard_bulk_templates_modal` |
| Message source modal | `campaign_wizard_message_source_selection` |
| Schedule errors | `campaign_wizard_sequence_validation_errors` |
| Merge errors | `campaign_wizard_merge_tag_validation_error` |

### QA gate — required before 6M-5

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `marketing_campaign_steps` rows: `step_order`, `send_at`, `subject`, `html_body`, `merge_config` jsonb · [ ] bulk creates N steps in order |
| **API** | [ ] `PUT /[id]/steps` validates order + future dates · [ ] rejects missing `{{first_name}}` (S6M-41) · [ ] `contact_message_mode` enum persisted · [ ] invalid schedule → `400` with field errors |
| **UI** | [ ] Sequence (`campaign_wizard_sequence`) · [ ] Bulk modal (`campaign_wizard_bulk_templates_modal`) · [ ] Message source (`campaign_wizard_message_source_selection`) · [ ] Error states: `campaign_wizard_sequence_validation_errors`, `campaign_wizard_merge_tag_validation_error` |

**Functional:** [ ] Step 2 datetime before step 1 → blocked · [ ] Bulk “Add 3 steps” creates 3 rows in DB · [ ] Edit step 1 subject → `test_valid` false if test was sent (when applicable)

---

## Sprint 6M-5 · Sender + review + launch (Slice 5 — Wizard steps 3–4)

**Goal:** Sender config, pre-flight, test send, admin launch, agent RBAC.

| Stories | S6M-3, S6M-10, S6M-21, S6M-22, S6M-23, S6M-24, S6M-25, S6M-32, S6M-14 |
|---------|-----------------------------------------------------------------------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `PUT` | `/[id]/sender` | Sender + signature; invalidates `test_valid` on change |
| `POST` | `/[id]/test-send` | `{ to_email? }` → sets `test_sent_*`, `test_valid: true` |
| `GET` | `/[id]/preflight` | Provider, domain, cron, test_valid, checks[] |
| `POST` | `/[id]/launch` | **Admin only** — snapshots steps (S6M-14), sets `launched_by/at` |
| `POST` | `/[id]/duplicate` | New draft per §4.11 (S6M-5 — can ship here or 6M-6) |

### UI
- [ ] Step 3: from/reply-to, signature editor, meeting/portfolio links, compliance preview (S6M-21–25)
- [ ] Step 4 admin: pre-flight table, sequence summary, sender, recipient paginated list (S6M-10, S6M-24)
- [ ] Test send card + success state (S6M-23)
- [ ] Test invalidated state when content changed (S6M-23)
- [ ] Launch confirmation modal (S6M-3)
- [ ] Step 4 **agent**: info banner, test send + save draft, **Launch hidden** (S6M-32)
- [ ] Post-launch redirect to stats; toast

### Stitch reference
| Screen | Folder |
|--------|--------|
| Step 3 sender | `campaign_wizard_sender_signature` |
| Step 4 admin | `campaign_wizard_review_launch` |
| Step 4 agent | `campaign_wizard_review_launch_agent_view` |
| Admin launch walkthrough | `admin_review_launch_walkthrough` |
| Launch confirm modal | `admin_launch_confirmation_modal` |
| Test invalid | `campaign_wizard_test_send_invalidated` |
| Marketing health | `settings_marketing_health` |
| Health error | `settings_marketing_health_error_state` |

### QA gate — required before 6M-6

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `test_sent_at`, `test_sent_by`, `test_sent_to` set after test · [ ] `launched_by`, `launched_at` on launch · [ ] `snapshot_at` on steps post-launch (S6M-14) · [ ] sender fields on campaign row |
| **API** | [ ] `PUT /sender` · [ ] `POST /test-send` → `test_valid: true` · [ ] `GET /preflight` · [ ] `POST /launch` admin `200` · [ ] agent `POST /launch` → **403** · [ ] launch without test → **400** |
| **UI** | [ ] Step 3 (`campaign_wizard_sender_signature`) · [ ] Step 4 admin (`campaign_wizard_review_launch`) · [ ] Agent view (`campaign_wizard_review_launch_agent_view`) — Launch hidden · [ ] Test invalid (`campaign_wizard_test_send_invalidated`) · [ ] Launch modal (`admin_launch_confirmation_modal`) |

**Functional:** [ ] Change sender after test → launch disabled until re-test · [ ] Post-launch redirect to stats · [ ] `launched_by` matches admin user in DB

---

## Sprint 6M-6 · Running campaign controls + duplicate (Slice 6)

**Goal:** Pause/cancel, duplicate, list row actions.

| Stories | S6M-4, S6M-5 |
|---------|--------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/[id]/control` | `{ action: "pause" \| "cancel" \| "resume" }` — admin only |
| `POST` | `/[id]/duplicate` | New draft; no recipients/test/launch state |

### UI
- [ ] List row kebab: View, Edit, **Duplicate**, Pause, Cancel
- [ ] Duplicate toast → open new draft at step 2, dates cleared
- [ ] Pause/cancel modal with impact summary + activity preview (S6M-4)
- [ ] Stats header: Pause | Cancel | Export

### Stitch reference
| Screen | Folder |
|--------|--------|
| Row menu + toast | `campaign_list_row_actions_duplicate` |
| Pause/cancel modal | `admin_pause_or_cancel_campaign_modal` |

### QA gate — required before 6M-7

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `status` → `paused` / `cancelled` with timestamps · [ ] duplicate creates new `draft` id · [ ] duplicate **no** recipient rows · [ ] pending `recipient_steps` → `skipped` on cancel |
| **API** | [ ] `POST /control` pause/cancel/resume — admin only · [ ] `POST /duplicate` → new id, name ` (copy)` · [ ] agent control → **403** |
| **UI** | [ ] Row menu (`campaign_list_row_actions_duplicate`) · [ ] Pause/cancel modal (`admin_pause_or_cancel_campaign_modal`) · [ ] Toast on duplicate |

**Functional:** [ ] Paused campaign: cron does not queue new sends · [ ] Cancel: activity log entry (when table exists)

---

## Sprint 6M-7 · Stats + export (Slice 7)

**Goal:** Overview, tabs, drill-down, CSV.

| Stories | S6M-26, S6M-27, S6M-28, S6M-29, S6M-43 |
|---------|----------------------------------------|

### API
| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/[id]/stats` | `{ overview, steps[], recipients[], activity[] }` |
| `GET` | `/[id]/export` | CSV stream (S6M-29) |

### UI
- [ ] Overview: funnel + **stop metrics** (bounced, unsub, replied, complained) + live progress bar
- [ ] Email Steps tab: per-step sent/delivered/open/click/stopped breakdown
- [ ] Recipients tab: filters (incl. stopped_*), expand row per-step timeline (S6M-43)
- [ ] Activity Log tab: chronological events, sanitized errors
- [ ] Export CSV button (admin; agent read-only optional)

### Stitch reference (canonical)
| Screen | Folder |
|--------|--------|
| Overview + stop metrics | `campaign_stats_overview_with_stop_metrics` |
| Email Steps tab | `campaign_stats_email_steps_tab_refined` |
| Recipients + expand | `campaign_stats_recipients_tab_refined` |
| Activity Log | `campaign_stats_activity_log_tab_refined` |

> Legacy screens (`campaign_stats_detail`, non-`_refined` tabs) — **do not implement from**; use refined only.

### QA gate — required before 6M-8

| Layer | Checks |
|-------|--------|
| **DB** | [ ] Aggregates match raw `recipient_steps` counts · [ ] `stopped_reason` filter queries use index |
| **API** | [ ] `GET /stats` returns `overview`, `steps[]`, `recipients[]`, `activity[]` · [ ] `GET /export` CSV content-type + rows · [ ] stats only for launched campaigns |
| **UI** | [ ] Overview (`campaign_stats_overview_with_stop_metrics`) — stop metrics + progress bar · [ ] Email steps (`campaign_stats_email_steps_tab_refined`) · [ ] Recipients expand (`campaign_stats_recipients_tab_refined`) · [ ] Activity log (`campaign_stats_activity_log_tab_refined`) · [ ] Export button |

**Functional:** [ ] Expand row timeline matches DB per-step status · [ ] CSV row count = recipient count · [ ] Complained count matches `stopped_reason=complaint`

---

## Sprint 6M-8 · CRM timeline (Slice 8)

**Goal:** Contact profile marketing history.

| Stories | S6M-30 |
|---------|--------|

### API
- [ ] `GET /contacts/[id]/marketing-timeline` (or extend contact API) — campaign events for contact

### UI
- [ ] Contact profile “Marketing Activity Timeline” section
- [ ] No “auto enrolled from CRM” badge (S6M-9)

### Stitch reference
| Screen | Folder |
|--------|--------|
| CRM timeline | `crm_contact_profile_timeline_integration` |

### QA gate — required before 6M-9

| Layer | Checks |
|-------|--------|
| **DB** | [ ] Timeline events match `marketing_campaign_recipient_steps` + activity table |
| **API** | [ ] Contact marketing timeline endpoint returns campaign events · [ ] no phantom “auto enrolled” events |
| **UI** | [ ] Contact profile section (`crm_contact_profile_timeline_integration`) · [ ] link to campaign stats |

**Functional:** [ ] Open/click/stop events appear after webhook simulation (prep for 6M-10)

---

## Sprint 6M-9 · Send engine + cron (Slice 9)

**Goal:** Process due sends, idempotency, skip rules.

| Stories | S6M-33, S6M-42, S6M-14 (runtime) |
|---------|-----------------------------------|

### API / jobs
- [ ] Cron `/api/cron/marketing` — query due `recipient_steps` (migration doc SQL)
- [ ] Idempotent send: unique `(recipient_id, campaign_step_id)` guard (S6M-42)
- [ ] Skip recipients with `stopped_reason` set
- [ ] Mark campaign `completed` when all steps done
- [ ] Write activity log entries on send/skip/fail

### UI
- [ ] Settings health: cron last-run timestamp (S6M-24, S6M-33)
- [ ] Pre-flight `cron_ok` on wizard step 4

### Stitch reference
| Screen | Folder |
|--------|--------|
| Health panel | `settings_marketing_health` |

### QA gate — required before 6M-10

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `marketing_campaign_recipient_steps` → `sent` with `sent_at`, `provider_message_id` · [ ] unique constraint prevents duplicate send · [ ] stopped recipients remain `pending`→`skipped` not `sent` |
| **API** | [ ] Local cron endpoint processes due rows · [ ] second cron tick idempotent (S6M-42) · [ ] campaign `running`→`completed` when done |
| **UI** | [ ] Settings cron last-run (`settings_marketing_health`) · [ ] preflight `cron_ok` on wizard step 4 |

**Functional:** [ ] Schedule step 1 `send_at` = now+2min → email queued/sent in local (provider sandbox) · [ ] Activity log `STEP_SENT` row

---

## Sprint 6M-10 · Webhooks + stop rules (Slice 10)

**Goal:** Bounce, unsub, reply, complaint handling.

| Stories | S6M-34, S6M-36, S6M-37, S6M-38, S6M-44 |
|---------|----------------------------------------|

### API
- [ ] Extend `/api/webhooks/email/[credentialId]` — map events to §1.2 status updates
- [ ] Hard bounce → `stopped_reason: bounce`, global suppress (S6M-36)
- [ ] Soft bounce → retry once, then stop (S6M-36)
- [ ] Unsubscribe → stop + suppress (S6M-37)
- [ ] Reply → stop remaining steps (S6M-38; ESP webhook until S7 thread match)
- [ ] Complaint → stop + suppress + activity entry (S6M-44)
- [ ] Other recipients in campaign unaffected (S6M-42)

### UI
- [ ] Stats stop metrics + activity log `COMPLAINT` / `RECIPIENT_STOP` events
- [ ] Settings: inbound webhook URL hint (S6M-34, R18)

### Stitch reference
| Screen | Folder |
|--------|--------|
| Stop metrics | `campaign_stats_overview_with_stop_metrics` |
| Activity log events | `campaign_stats_activity_log_tab_refined` |
| Email step stopped breakdown | `campaign_stats_email_steps_tab_refined` |

### QA gate — required before 6M-11

| Layer | Checks |
|-------|--------|
| **DB** | [ ] `stopped_reason` set: bounce, unsubscribe, reply, complaint · [ ] global suppress table updated for bounce/complaint/unsub · [ ] other recipients still `pending`/active |
| **API** | [ ] Webhook POST (local tunnel or fixture) updates recipient + step status · [ ] invalid signature → **401** · [ ] soft bounce `retry_count` increment |
| **UI** | [ ] Stop metrics update · [ ] Activity log `COMPLAINT`, `RECIPIENT_STOP` · [ ] Webhook hint on settings |

**Functional:** [ ] Simulated complaint stops remaining steps for **one** recipient only · [ ] Overview “Complained” +1

---

## Sprint 6M-11 · Polish + QA hardening

**Goal:** Autosave, errors, mobile, full DoD.

| Stories | S6M-31, S6M-39, S6M-40, remaining gaps |
|---------|----------------------------------------|

### QA gate — epic sign-off (required before staging deploy)

Run **full** [§9 QA checklist](marketing-module-screens.md#9-qa-checklist-development) + [email-marketing-standard DoD](email-marketing-standard.md#definition-of-done-sign-off-checklist):

| Layer | Final checks |
|-------|----------------|
| **DB** | [ ] All S6M tables populated correctly on full marketer journey · [ ] no orphan rows · [ ] migration replay on clean DB |
| **API** | [ ] Full §7.1 contract · [ ] all RBAC matrix §8 · [ ] webhook + cron integration tests green |
| **UI** | [ ] All canonical Stitch screens implemented · [ ] agent + admin paths · [ ] mobile spot-check · [ ] accessibility spot-check |

```bash
pnpm typecheck && pnpm lint && pnpm test   # all packages
# Manual: admin journey + agent journey + contact journey (DoD doc)
```

**Tasks (implementation)**
- [ ] Wizard autosave on step change / blur (S6M-39)
- [ ] Human-readable error toasts (S6M-31)
- [ ] Loading skeletons on stats tabs
- [ ] Agent step 4 test-send card
- [ ] Campaign ID copy on all wizard steps
- [ ] FlowChat branding pass (no SalesHub)

---

## Quick reference — Stitch screen map

| Route / surface | Canonical Stitch folder |
|-----------------|-------------------------|
| `/marketing/campaigns` (list) | `marketing_campaigns_list` |
| List empty | `campaign_list_empty_state` |
| List mobile | `campaign_list_mobile` |
| List row menu | `campaign_list_row_actions_duplicate` |
| Wizard step 1 | `campaign_wizard_recipients` |
| Wizard step 2 | `campaign_wizard_sequence` |
| Bulk templates modal | `campaign_wizard_bulk_templates_modal` |
| Message source modal | `campaign_wizard_message_source_selection` |
| Sequence validation | `campaign_wizard_sequence_validation_errors` |
| Merge validation | `campaign_wizard_merge_tag_validation_error` |
| Composer | `campaign_wizard_full_screen_composer` |
| Wizard step 3 | `campaign_wizard_sender_signature` |
| Wizard step 4 admin | `campaign_wizard_review_launch` |
| Wizard step 4 agent | `campaign_wizard_review_launch_agent_view` |
| Test invalid | `campaign_wizard_test_send_invalidated` |
| Launch modal | `admin_launch_confirmation_modal` |
| Pause/cancel modal | `admin_pause_or_cancel_campaign_modal` |
| Templates | `template_library` |
| Templates empty | `template_library_empty_state` |
| Segments | `marketing_segments_management` |
| Stats overview | `campaign_stats_overview_with_stop_metrics` |
| Stats email steps | `campaign_stats_email_steps_tab_refined` |
| Stats recipients | `campaign_stats_recipients_tab_refined` |
| Stats activity log | `campaign_stats_activity_log_tab_refined` |
| Contact timeline | `crm_contact_profile_timeline_integration` |
| Settings health | `settings_marketing_health` |
| Settings health error | `settings_marketing_health_error_state` |

---

## Story coverage matrix (by sub-sprint)

| Sub-sprint | Stories |
|------------|---------|
| 6M-0 | S6M-9, S6M-31, S6M-33, S6M-35 |
| 6M-1 | S6M-1, S6M-2, S6M-39, S6M-40 |
| 6M-2 | S6M-6, S6M-7, S6M-8 |
| 6M-3 | S6M-11, S6M-12, S6M-13, S6M-15, S6M-20 |
| 6M-4 | S6M-16, S6M-17, S6M-18, S6M-19, S6M-41 |
| 6M-5 | S6M-3, S6M-10, S6M-14, S6M-21–25, S6M-32 |
| 6M-6 | S6M-4, S6M-5 |
| 6M-7 | S6M-26, S6M-27, S6M-28, S6M-29, S6M-43 |
| 6M-8 | S6M-30 |
| 6M-9 | S6M-33, S6M-42 |
| 6M-10 | S6M-34, S6M-36, S6M-37, S6M-38, S6M-44 |
| 6M-11 | S6M-31, S6M-39, S6M-40 + QA |

**All 44 stories assigned.**

---

*Last updated: 2026-06-13 · Vertical-slice order for S6M implementation*
