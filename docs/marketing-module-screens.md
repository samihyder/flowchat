# FlowChat — Marketing Campaign Module (Screen Design)

**Epic:** S6M — Marketing Campaign Redesign  
**Status:** Locked for UI development  
**Design (visual):** [marketing-module-design.md](marketing-module-design.md)  
**Related:** User stories `S6M-1` … `S6M-44` in `FlowChat_User_Stories_S1_S6.xlsx`  
**Database (planned):** [marketing-module-migration.md](marketing-module-migration.md)  
**Last updated:** 2026-06-13  
**Completeness:** Story traceability 44/44 · Design spec locked · Stories ↔ design aligned (§0.1, §1.2)

---

## 0. Requirements traceability

Locked product requirements mapped to stories (S6M) and screens (§4).

| # | Requirement | Stories | Design |
|---|-------------|---------|--------|
| R1 | No marketing email on contact create (any medium) | S6M-9 | §5 |
| R2 | All outreach from Marketing tab only | S6M-35, S6M-9 | §2 nav |
| R3 | Campaign ID on draft create | S6M-1 | §4.2 |
| R4 | Explicit recipient selection | S6M-6, S6M-10 | §4.2 |
| R5 | Optional segment import (not auto-send) | S6M-7 | §4.2.1, §4.8 |
| R6 | Multi-step sequence with explicit datetime | S6M-16–18, S6M-39 | §4.3 |
| R7 | Template library + in-wizard save-as-template | S6M-11–13 | §4.3, §4.7 |
| R8 | Full-screen enterprise composer | S6M-12 | §3 composer |
| R9 | Merge tags + message source mode | S6M-15, S6M-19, S6M-41 | §6, §6.1 |
| R10 | Signature + meeting/portfolio footer | S6M-21–22, S6M-25 | §4.4 |
| R11 | Mandatory test send before launch | S6M-23 | §4.5B |
| R12 | Admin-only launch | S6M-3, S6M-32 | §4.5, §4.5C, §8 |
| R13 | Pre-flight provider + cron health | S6M-24, S6M-33 | §4.5A, §4.9 |
| R14 | No attachments | S6M-20 | §4.3 |
| R15 | Stop follow-ups: bounce / unsub / reply / complaint (per recipient) | S6M-36–38, S6M-42, S6M-44 | §1, §1.2 |
| R16 | Campaign stats + per-step + per-recipient detail | S6M-26–28, S6M-29, S6M-30, S6M-43 | §4.6 |
| R17 | Safe errors (try/catch) | S6M-31 | §3.1 |
| R18 | BYOK Resend/SendGrid/Mailgun + webhooks | S6M-24, S6M-34 | §4.4, §7.1 |
| R19 | Snapshot content at launch | S6M-14 | §1.3 |
| R20 | Bulk multi-template → multiple steps | S6M-16 | §4.3.2 |

**Out of scope v1:** attachments, A/B tests, CRM triggers, recipient timezone send optimization (§11).

### 0.1 Complete story traceability (S6M-1 … S6M-44)

Every S6M story maps to at least one design section. Supporting stories (not R1–R20) included.

| Story | Theme | Design section(s) |
|-------|-------|-------------------|
| S6M-1 | Campaign ID on create | §4.2 header, §7.1 POST campaigns |
| S6M-2 | Campaign list + filters | §4.1 |
| S6M-3 | Admin launch + audit | §4.5, §4.6 header, §7.1 launch |
| S6M-4 | Pause / cancel | §4.10, §7.1 control |
| S6M-5 | Duplicate campaign | §4.11 |
| S6M-6 | Recipient multi-select | §4.2 A–B, D |
| S6M-7 | Segment import shortcut | §4.2.1, §4.8 |
| S6M-8 | Suppression warnings | §4.2 B badges, D warnings, §4.5C summary |
| S6M-9 | No CRM triggers | §5 |
| S6M-10 | Review recipient list | §4.5D |
| S6M-11 | Template library | §4.7, §3 plain text |
| S6M-12 | Full-screen composer | §3 composer |
| S6M-13 | Save as template | §4.3 step card, §3 bottom bar |
| S6M-14 | Snapshot at launch | §1.3, §7.1 launch |
| S6M-15 | Merge tag chips | §3 right rail, §6 |
| S6M-16 | Multi-step sequence | §4.3, §4.3.2 |
| S6M-17 | Date+time per step | §4.3 timeline, step card |
| S6M-18 | Schedule validation | §4.3 validation |
| S6M-19 | contact_message source mode | §4.3.1, §6.1 |
| S6M-20 | No attachments | §4.3, §3 |
| S6M-21 | Signature block | §4.4 signature |
| S6M-22 | Meeting/portfolio links | §4.4 footer links |
| S6M-23 | Mandatory test send | §4.5B, §1.3 test fields |
| S6M-24 | Pre-flight panel | §4.5A, §4.9 |
| S6M-25 | Compliance footer | §4.4 compliance preview |
| S6M-26 | Overview + activity log | §4.6 Overview, Activity log tabs |
| S6M-27 | Per-step stats | §4.6 Email steps tab |
| S6M-28 | Recipient table + filters | §4.6 Recipients tab, §1.2 filters |
| S6M-29 | CSV export | §4.6 header actions, §7.1 export |
| S6M-30 | Contact profile timeline | §5 |
| S6M-31 | Safe errors | §3.1, §3 errors |
| S6M-32 | Admin-only launch RBAC | §4.5C, §8 |
| S6M-33 | Cron / worker | §4.9, §7.1 cron |
| S6M-34 | Delivery webhooks | §7.1 webhooks |
| S6M-35 | Nav cleanup | §2 nav, route map |
| S6M-36 | Hard/soft bounce stop | §1 stop rules, §1.2 |
| S6M-37 | Unsubscribe stop | §1 stop rules, §1.2 |
| S6M-38 | Reply stop | §1 stop rules, §7.1 webhooks |
| S6M-39 | Wizard navigation + autosave | §3 wizard chrome |
| S6M-40 | UX consistency | §3 layout, §2 breadcrumbs |
| S6M-41 | Merge validation | §4.3 validation, §6 |
| S6M-42 | Send engine skip | §1.2, §4.6 activity log |
| S6M-43 | Per-recipient drill-down | §4.6 expand row |
| S6M-44 | Spam complaint stop | §1 stop rules, §1.2 |

---

## 1. Product summary

### Vision
Marketing is **campaign-centric only**. Sales agents and admins build **multi-step email campaigns** from the Marketing tab. **No email is sent when a contact is created** via CRM, import, LeadSnapper, or chat.

### Core entities

| Entity | Description |
|--------|-------------|
| **Campaign** | Named outreach with recipients, 1..N email steps, sender/signature, lifecycle status |
| **Campaign step** | One email in the sequence: subject, HTML body, `send_at` datetime, optional template link, `merge_config` |
| **Campaign recipient** | Contact enrolled in campaign; tracks per-step status and `stopped_reason` |
| **Template** | Reusable email content in library; snapshotted at campaign launch |
| **Segment** | Optional shortcut to load static list into recipient picker (not auto-send) |

### Campaign statuses

| Status | Meaning |
|--------|---------|
| `draft` | Wizard in progress; editable |
| `scheduled` | Launched; first step in future |
| `running` | At least one send in progress or pending |
| `paused` | Admin paused; no new sends |
| `completed` | All steps done or all recipients terminal |
| `cancelled` | Admin cancelled |

### Recipient step statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not yet sent |
| `queued` | In send batch |
| `sent` | Handed to provider |
| `delivered` | Provider confirmed delivery |
| `opened` / `clicked` | Engagement event |
| `failed` | Send error (retryable or not) |
| `stopped_bounce` | Hard bounce; remaining steps skipped |
| `stopped_unsubscribe` | Unsubscribed; remaining steps skipped |
| `stopped_reply` | Replied to campaign mail; remaining steps skipped |
| `stopped_complaint` | Spam complaint; remaining steps skipped |
| `skipped` | Suppressed at launch or campaign cancelled |

### Stop rules (per recipient, per campaign)

When **hard bounce**, **unsubscribe**, **reply**, or **spam complaint** occurs for a recipient’s email address:

1. Set `stopped_reason` on `campaign_recipient`
2. Cancel all **pending** steps for that recipient **in this campaign only**
3. Other recipients and other campaigns are unaffected
4. Hard bounce and complaint also **globally suppress** the address (industry ESP practice)

**Soft bounce:** retry once after 4 hours; second soft bounce within 72h treated as hard bounce (S6M-36).

### 1.2 Canonical status enums (stories ↔ DB ↔ UI)

Two layers — do not conflate:

| Layer | Field | Values |
|-------|-------|--------|
| **Recipient** | `campaign_recipient.stopped_reason` | `null` \| `bounce` \| `unsubscribe` \| `reply` \| `complaint` |
| **Step** | `campaign_recipient_step.status` | `pending` \| `queued` \| `sent` \| `delivered` \| `opened` \| `clicked` \| `failed` \| `stopped_bounce` \| `stopped_unsubscribe` \| `stopped_reply` \| `stopped_complaint` \| `skipped` |

**Mapping when stop event fires**

| `stopped_reason` (recipient) | Pending steps become `status` |
|------------------------------|-------------------------------|
| `bounce` | `stopped_bounce` |
| `unsubscribe` | `stopped_unsubscribe` |
| `reply` | `stopped_reply` |
| `complaint` | `stopped_complaint` |

**UI recipient filters (S6M-28)** use step-style keys for clarity: `stopped_bounce`, `stopped_unsubscribe`, `stopped_reply`, `stopped_complaint` — filter matches `campaign_recipient.stopped_reason` via map above.

**Stats counters** aggregate by `stopped_*` step status or equivalent recipient `stopped_reason`.

### 1.3 Campaign record fields (persistence contract)

| Field | Set when | Used by |
|-------|----------|---------|
| `id` | Draft create (S6M-1) | All screens header |
| `status` | Lifecycle transitions | §4.1 badges, §4.6 |
| `created_by`, `created_at` | Draft create | §4.1, §4.6 |
| `launched_by`, `launched_at` | Launch (S6M-3) | §4.6 header |
| `test_sent_at`, `test_sent_by`, `test_sent_to` | Successful test (S6M-23) | §4.5B pre-flight |
| `test_valid` | Computed: test_sent_at set AND step 1 + sender unchanged since | Launch gate |
| `paused_at`, `cancelled_at` | Control actions (S6M-4) | §4.6 actions |
| `merge_config` (on steps) | Step save | §6.1, §4.3.1 |

**Test invalidation (S6M-23):** Set `test_valid=false` when any of: step 1 `subject`, step 1 `html_body`, `from_email`, `from_name`, `reply_to`, signature fields change after `test_sent_at`.

---

## 2. Information architecture

### Marketing navigation (replaces current nav)

```
Marketing
├── Campaigns          /dashboard/marketing/campaigns
├── Templates          /dashboard/marketing/templates
└── (optional) Segments /dashboard/marketing/segments
```

**Removed from nav:** Email automations (merged), Workflows with CRM triggers.

**Settings links (outside Marketing):**
- Settings → Email marketing (sender defaults, signature, footer address)
- Settings → Connected services (Resend / SendGrid / Mailgun BYOK)

### Route map

| Route | Screen |
|-------|--------|
| `/dashboard/marketing/campaigns` | Campaign list |
| `/dashboard/marketing/campaigns/new` | Wizard step 1 (creates draft + id) |
| `/dashboard/marketing/campaigns/[id]/edit?step=1..4` | Wizard steps |
| `/dashboard/marketing/campaigns/[id]` | Campaign detail / stats |
| `/dashboard/marketing/templates` | Template library |
| `/dashboard/marketing/templates/new` | New template (full-screen editor) |
| `/dashboard/marketing/templates/[id]/edit` | Edit template |

---

## 3. Global UI patterns

### Layout
- Uses dashboard shell: sidebar + main content
- Marketing sub-nav tabs below page header (Campaigns | Templates)
- Max content width: `max-w-5xl` for wizard; `max-w-7xl` for stats tables

### Wizard chrome (all steps)
- **Header:** Campaign name (editable) + status badge + campaign ID (mono, copy button)
- **Stepper:** `1 Recipients` → `2 Sequence` → `3 Sender` → `4 Review`
- **Footer:** Back | Save draft | Next (or Launch on step 4)
- **Autosave:** On step change and every 30s; toast “Draft saved”

### Full-screen email composer (overlay)
- Triggered from Sequence step or Template library
- **Z-index** above dashboard; `position: fixed; inset: 0`
- **Top bar:** Subject input | Preview toggle | Save | Close
- **Body:** Rich editor (min height 60vh)
- **Right rail (desktop):** Merge tag chips + sample preview
- **Bottom bar:** “Save as template” checkbox + template name (if checked)
- **Plain text:** Auto-generated from HTML on save; editable in advanced collapse (S6M-11)
- **Validation on close:** Warn if subject empty

### Error display
- Inline field errors (red border + message)
- Step-level alert banner for blocking issues
- Toast for save/network errors
- Never show raw provider JSON

### 3.1 MarketingError codes (S6M-31)

API returns `{ error: string, code: MarketingErrorCode }`. UI maps codes to human copy.

| Code | User message (example) | HTTP |
|------|------------------------|------|
| `PROVIDER_NOT_CONFIGURED` | Connect an email provider in Settings → Connected services. | 400 |
| `DOMAIN_NOT_VERIFIED` | Verify your sending domain before launching. | 400 |
| `CRON_UNHEALTHY` | Background scheduler is not running. Contact your administrator. | 503 |
| `TEST_SEND_REQUIRED` | Send a test email before launching this campaign. | 400 |
| `TEST_SEND_INVALIDATED` | Campaign content changed since last test. Send a new test email. | 400 |
| `RECIPIENTS_REQUIRED` | Select at least one recipient. | 400 |
| `ALL_SUPPRESSED` | All selected recipients are suppressed. | 400 |
| `MERGE_VALIDATION_FAILED` | Fix merge field errors on highlighted steps. | 400 |
| `SCHEDULE_INVALID` | Each email must be scheduled after the previous one. | 400 |
| `LAUNCH_FORBIDDEN` | Only administrators can launch campaigns. | 403 |
| `ATTACHMENTS_NOT_ALLOWED` | Attachments are not supported in marketing emails. | 400 |
| `SEND_FAILED` | Email could not be sent. Try again or check provider settings. | 502 |
| `CAMPAIGN_NOT_EDITABLE` | This campaign can no longer be edited. | 409 |

Provider/raw errors logged server-side only; never returned in `error` body.

---

## 4. Screen specifications

### 4.1 Campaign list (`/dashboard/marketing/campaigns`)

**Purpose:** Hub for all campaigns.

**Header**
- Title: “Campaigns”
- Subtitle: “Build multi-step outreach — recipients choose who receives mail”
- Primary CTA: **+ New campaign** → `/campaigns/new`

**Metrics row (optional)**
- Total campaigns | Running | Drafts | Emails sent (30d)

**Table columns**
| Column | Content |
|--------|---------|
| Name | Link to detail |
| Status | Badge |
| Recipients | Count |
| Steps | Email count |
| Next send | Datetime or “—” |
| Created by | Agent name |
| Updated | Relative time |
| Actions | ⋮ menu |

**Filters**
- Status: All | Draft | Running | Completed | Cancelled
- Search by name

**Row actions**
- Edit (draft only)
- Duplicate
- Pause / Cancel (running)
- View stats

**Empty state**
- Illustration + “No campaigns yet” + CTA New campaign

---

### 4.2 Wizard — Step 1: Recipients

**URL:** `/campaigns/new` or `/campaigns/[id]/edit?step=1`

**On first visit to `/new`:**
- POST create draft → redirect to `/campaigns/[id]/edit?step=1`
- Show campaign ID in header

**Content**

**A. Search & filter**
- Search: name, email, company
- Filter: subscribed only (default on)

**B. Recipient table**
| ☐ | Name | Email | Company | Status |
|---|------|-------|---------|--------|
| Checkbox | … | … | … | subscribed / suppressed badge |

- Select all on page
- Pagination 25/page

**C. Import from segment (secondary)**

See **§4.2.1** for full behaviour (S6M-7).

**D. Selection summary (sticky footer)**
- “{n} recipients selected”
- Warning if any suppressed selected: “{m} will be excluded at launch”

**Validation (Next)**
- ≥ 1 recipient with email
- Block if all selected are suppressed

**Errors**
- `RECIPIENTS_REQUIRED`
- `ALL_SUPPRESSED`

#### 4.2.1 Import from segment (S6M-7)

Subsection of step 1 — optional shortcut, not auto-send.

- Dropdown: static segments only (dynamic segments show preview count before import)
- Button: “Add segment members to selection”
- Merges member contact ids into current selection; user may deselect individuals
- Does not link campaign to segment for future auto-enrollment

---

### 4.3 Wizard — Step 2: Email sequence

**URL:** `/campaigns/[id]/edit?step=2`

**Purpose:** Define 1..N emails with schedule and content.

**Sequence timeline (top)**
- Horizontal timeline of steps with dates (updates live)

**Per-step card (repeatable)**

```
┌─ Email 1 ────────────────────────────────────────┐
│ Send at: [date picker] [time picker]              │
│ Template: [Select template ▼] or [Write new]      │
│ Subject: ________________________________         │
│ Body preview snippet (or “Not written yet”)       │
│ [Open full-screen editor]                         │
│ ☐ Save as template  Name: [________] (if checked) │
│ [Remove step] (disabled if only 1)                │
└──────────────────────────────────────────────────┘
```

**Actions**
- **+ Add follow-up email** — appends step; default send_at = previous + 3 days 09:00
- **Bulk add from templates** — opens §4.3.2 modal

**Full-screen editor (from step card)**
- See §3 composer pattern
- **Merge tags (chips):** `first_name`, `last_name`, `email`, `phone`, `contact_message`, `meeting_link`, `portfolio_link`, `agent_name`, `agent_email`
- **`contact_message`:** Opens §4.3.1 source mode picker when token inserted
- **Mandatory validation:** Body must contain `{{first_name}}` (S6M-41)
- **No attachment** control (absent by design)

**Validation (Next)**
- Each step: subject non-empty, body non-empty, send_at set
- Each send_at > now
- Step N send_at > step N-1 send_at
- If `{{contact_message}}` in content → source mode configured per step (§6.1)

---

### 4.3.1 Message source mode picker (modal)

**Trigger:** Insert `{{contact_message}}` chip, or “Configure message source” on step card when token present.

**Layout**
```
┌─ Message source for {{contact_message}} ─────────────┐
│ Preview contact: [Jane Doe ▼]  (from recipients)    │
│                                                      │
│ Source mode (resolved per recipient at send):        │
│ ○ Latest CRM note                                    │
│ ○ Latest inbound chat message                        │
│ ● Latest note or chat (recommended fallback)         │
│                                                      │
│ Preview (sample contact only):                       │
│ ┌────────────────────────────────────────────────┐   │
│ │ "Thanks for the demo yesterday — we loved…"    │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│              [Cancel]  [Save source mode]            │
└──────────────────────────────────────────────────────┘
```

**Behaviour**
- Preview contact defaults to first selected recipient; dropdown to pick another for preview
- Preview shows resolved text for **sample contact only** using selected mode
- Stored on step as `merge_config.contact_message_mode`
- Empty resolution at send omits token (no `{{contact_message}}` literal in output)

**Empty states**
- No notes/messages for sample: “No content for preview — token will be omitted for contacts without data”
- No recipients yet: “Select recipients on step 1 to preview”

---

### 4.3.2 Bulk template apply (modal)

**Trigger:** “Bulk add from templates” on step 2.

```
┌─ Add multiple emails from templates ─────────────────┐
│ Search templates…                                    │
│ ☑ Welcome — Q1 outreach                              │
│ ☑ Follow-up — case study                             │
│ ☐ Re-engagement                                      │
│                                                      │
│ Default spacing between steps: [3] days at [09:00]   │
│ First step send at: [date] [time]                    │
│                                                      │
│ Creates 2 new steps (dates auto-filled, editable)    │
│                                                      │
│              [Cancel]  [Add 2 steps]                 │
└──────────────────────────────────────────────────────┘
```

**Behaviour**
- Multi-select templates → one step per template in selection order
- Step 1 datetime from picker; step N+1 = previous + spacing days at chosen time
- User adjusts individual dates on timeline after confirm
- Each step gets template subject/body snapshot into draft (not live link until launch)

---

### 4.4 Wizard — Step 3: Sender & signature

**URL:** `/campaigns/[id]/edit?step=3`

**Sender block**
- From name (default workspace)
- From email (dropdown: verified senders from Settings → Email marketing)
- Reply-to (optional)
- **Provider route read-only:** “Sending via Connected Resend (key fc_…abc)” or platform Resend

**Signature block**
- Rich editor for HTML signature
- Checkbox: “Use workspace default signature”
- Preview with sample agent name

**Footer links**
- Meeting link (Calendly URL) — default from settings, overridable
- Portfolio link — default from settings, overridable
- Preview shows: Body → Agent name → Signature → Links → Compliance footer (read-only grey)

**Compliance preview (read-only)**
- Physical address + unsubscribe link sample

**Validation**
- Signature or workspace default required
- From email must be verified domain

---

### 4.5 Wizard — Step 4: Review & launch

**URL:** `/campaigns/[id]/edit?step=4`

**Sections**

**A. Pre-flight checks (S6M-24)**
| Check | Status |
|-------|--------|
| Email provider connected | ✓ / ✗ |
| Sending domain verified | ✓ / ✗ |
| Background scheduler (cron) | ✓ / ✗ last run {time} |
| Test email sent | ✓ / ✗ |

**B. Test send (S6M-23) — mandatory**
- Button: “Send test to me”
- Uses step 1 content + logged-in user as merge sample
- Launch disabled until test succeeded **for this campaign draft** (stored on campaign; survives logout)
- Re-test required if step 1 subject/body or sender changes after last successful test
- Shows: “Last test sent {relative time} by {name} to {email}”

**C. Summary**
- Campaign name, id
- Recipients: {n} ({excluded} suppressed excluded)
- Steps table: # | subject | send at | message source mode (if any)
- Sender line

**D. Recipient preview**
- Paginated list (name, email)
- Link “Edit recipients”

**Primary CTA**
- **Launch campaign** (admin only)
- Secondary: Save draft

**Launch confirmation modal**
- “Send {n} recipients × {steps} emails starting {datetime}?”
- Confirm | Cancel

**Post-launch**
- Redirect to `/campaigns/[id]` stats view
- Toast: “Campaign launched”
- Stats header shows launched by + launched at (S6M-3)

---

### 4.5C Agent (non-admin) on Step 4

When logged-in user is **not** administrator:

- Info banner (blue): “An administrator must launch this campaign. You can save the draft and send a test email.”
- **Launch campaign** button hidden (not merely disabled)
- **Send test to me** and **Save draft** remain enabled
- Pre-flight panel visible read-only

---

### 4.6 Campaign detail / stats (`/dashboard/marketing/campaigns/[id]`)

**Header**
- Campaign name + status badge
- Actions: Pause | Cancel | Export CSV (admin)
- Metadata: created by, launched by, launched at, campaign id

**Tabs**

#### Tab: Overview
- **Funnel metrics:** Enrolled → Sent → Delivered → Opened → Clicked
- **Stop metrics:** Bounced | Unsubscribed | Replied | Complained (stopped)
- **Rates:** Open %, Click %, Bounce %
- **Live progress bar** (when running): “Processing step 2 of 3 — 45/120 recipients”

#### Tab: Email steps
- Card per step:
  - Subject, scheduled time, actual send window
  - Sent / delivered / open / click / stopped counts (by reason)
  - Mini bar chart (optional v1: numbers only)

#### Tab: Recipients
- Table:
  | Contact | Email | Current step | Last status | Stopped reason | Last event |
- **Expand row** → per-step timeline (sent, opened, clicked, stopped per email — S6M-43)
- Filters: All | Opened | Not opened | Clicked | Stopped (bounce / unsubscribe / reply / complaint) | Failed
- Filter keys: `stopped_bounce`, `stopped_unsubscribe`, `stopped_reply`, `stopped_complaint` (§1.2)
- Row click → contact profile

#### Tab: Activity log (S6M-26)
- Chronological: send attempts, webhook events, soft-bounce retries, skips, complaints, sanitized errors
- For admin debugging; export optional v2

---

### 4.7 Template library (`/dashboard/marketing/templates`)

**List**
- Name | Subject preview | Updated | Actions (Edit, Duplicate, Archive)

**New / Edit template**
- Opens same full-screen composer as wizard
- No recipients or schedule
- Save returns to list

---

### 4.8 Segments (optional, unchanged scope)

**Static segments only** for import into Step 1.  
No auto-trigger on segment membership change.

---

### 4.9 Settings — Marketing health panel

**URL:** `/settings/email-marketing` (section at bottom)

**Purpose:** Standalone pre-flight view (also mirrored on wizard step 4).

| Check | Detail |
|-------|--------|
| Email provider | Connected Resend / SendGrid / Mailgun or platform Resend |
| Domain verified | From-address domain status |
| Cron / worker | Last `/api/cron/marketing` success timestamp |
| Webhooks | Inbound webhook URL configured hint |

Failures link to Connected services or infrastructure docs.

---

### 4.10 Pause / cancel confirmation (S6M-4)

**Trigger:** Pause or Cancel from campaign list row menu or stats header (admin only).

**Pause modal**
- Title: “Pause campaign?”
- Body: “No new emails will send. Messages already queued may still deliver.”
- Shows: pending recipient-steps count
- Actions: Pause campaign | Keep running

**Cancel modal**
- Title: “Cancel campaign?”
- Body: “All pending emails for this campaign will be skipped. This cannot be undone.”
- Shows: recipients with pending steps, next scheduled send time
- Actions: Cancel campaign (destructive) | Go back

**Post-action:** Toast + status badge update; activity log entry (S6M-26).

---

### 4.11 Duplicate campaign (S6M-5)

**Trigger:** Row action “Duplicate” on list or stats header (any role with edit access).

**Behaviour**
- POST duplicate → new draft campaign id
- Copies: name + “ (copy)”, step snapshots (subject/html/schedule structure), sender/signature defaults
- Does **not** copy: recipients, launch audit, test-send state, running status
- Redirect to `/campaigns/[newId]/edit?step=2` with dates cleared (user must reschedule)

---

## 5. CRM integration points

| Location | Behaviour |
|----------|-----------|
| Contact create/import | **No** marketing trigger |
| Contact profile | Timeline: campaign emails, opens, clicks, stopped events |
| Contact profile | No “auto enrolled” badge from CRM |
| Manual enroll (old) | **Removed** — use campaign wizard instead |

---

## 6. Merge tags reference

| Tag | Source | Required in body |
|-----|--------|------------------|
| `{{first_name}}` | Contact name | **Yes** (validation) |
| `{{last_name}}` | Contact name split | No |
| `{{email}}` | Contact email | No |
| `{{phone}}` | Contact phone | No (omit if empty) |
| `{{contact_message}}` | Per-recipient per §6.1 | Source mode required if token used |
| `{{meeting_link}}` | Settings / campaign override | No |
| `{{portfolio_link}}` | Settings / campaign override | No |
| `{{agent_name}}` | Logged-in user | No |
| `{{agent_email}}` | Logged-in user | No |

**Footer structure (render order)**
1. Email body (merged)
2. Agent display name
3. Signature HTML
4. Meeting + portfolio blocks (if configured)
5. Compliance: address + unsubscribe (system)

---

### 6.1 `{{contact_message}}` resolution (industry standard)

Aligned with HubSpot/Mailchimp dynamic-content practice: **wizard configures a rule; send engine resolves per recipient**.

| Mode | Per-recipient resolution at send |
|------|----------------------------------|
| `latest_note` | Newest CRM note (`notes.created_at DESC`) |
| `latest_inbound_chat` | Newest visitor-originated message in any linked conversation |
| `latest_note_or_chat` | Inbound chat if any, else latest note, else omit token |

- Preview in composer/modal uses **sample contact only** (not one fixed message for all recipients).
- `merge_config.contact_message_mode` stored on each campaign step.
- Empty resolution: omit token content (same pattern as empty `{{phone}}`).

---

## 7. API surface (for implementation phase)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/.../marketing/campaigns` | Create draft |
| GET/PATCH | `/api/.../marketing/campaigns/[id]` | Read/update draft |
| PUT | `/api/.../marketing/campaigns/[id]/recipients` | Set recipient ids |
| PUT | `/api/.../marketing/campaigns/[id]/steps` | Set sequence + merge_config |
| PUT | `/api/.../marketing/campaigns/[id]/sender` | Sender + signature |
| POST | `/api/.../marketing/campaigns/[id]/test-send` | Mandatory test |
| GET | `/api/.../marketing/campaigns/[id]/preflight` | Health checks |
| POST | `/api/.../marketing/campaigns/[id]/launch` | Admin launch |
| POST | `/api/.../marketing/campaigns/[id]/control` | pause/cancel |
| GET | `/api/.../marketing/campaigns/[id]/stats` | Overview + steps + recipients |
| GET | `/api/.../marketing/campaigns/[id]/export` | CSV |

**Webhook handlers (existing, extend):**
- Hard bounce → stop recipient steps (S6M-36)
- Unsubscribe → stop + suppress (S6M-37)
- Inbound reply → stop (S6M-38; Sprint 7 inbox primary)
- Spam complaint → stop + suppress (S6M-44)

### 7.1 API request/response contract

Base: `/api/accounts/[accountId]/marketing/campaigns`

**POST /** — create draft (S6M-1)  
Response `201`: `{ id, status: "draft", created_at, created_by }`

**PATCH /[id]** — update name, wizard step pointer  
Body: `{ name?, current_step? }`

**PUT /[id]/recipients** (S6M-6, S6M-7, S6M-8)  
Body: `{ contact_ids: string[] }`  
Response: `{ selected: number, excluded: { suppressed: number, reasons: Record<string, number> } }`

**PUT /[id]/steps** (S6M-16–19, S6M-41)  
Body: `{ steps: [{ step_order, send_at, subject, html_body, plain_body?, merge_config?, save_as_template?, template_name? }] }`  
`merge_config`: `{ contact_message_mode?: "latest_note" | "latest_inbound_chat" | "latest_note_or_chat" }`

**PUT /[id]/sender** (S6M-21–22)  
Body: `{ from_name, from_email, reply_to?, signature_html?, use_workspace_signature?, meeting_link?, portfolio_link? }`  
Invalidates `test_valid` if sender fields changed (§1.3).

**POST /[id]/test-send** (S6M-23)  
Body: `{ to_email?: string }` — default logged-in user email  
Response `200`: `{ test_sent_at, test_sent_by, test_sent_to, test_valid: true }`

**GET /[id]/preflight** (S6M-24)  
Response: `{ provider_ok, domain_ok, cron_ok, cron_last_at, test_valid, checks: PreflightCheck[] }`

**POST /[id]/launch** (S6M-3) — admin only  
Preconditions: preflight pass, test_valid, merge validation, recipients ≥ 1  
Response `200`: `{ status: "scheduled"|"running", launched_at, launched_by }`  
Snapshots step content (S6M-14).

**POST /[id]/control** (S6M-4) — admin only  
Body: `{ action: "pause" | "cancel" | "resume" }`

**GET /[id]/stats** (S6M-26–28, S6M-43)  
Response: `{ overview, steps[], recipients[], activity[] }`

**GET /[id]/export** (S6M-29) — CSV stream

**Webhooks** (S6M-34, S6M-36–38, S6M-44): existing `/api/webhooks/email/[credentialId]` — map events to §1.2 status updates.

---

## 8. RBAC

| Action | Administrator | Agent |
|--------|---------------|-------|
| View campaigns | ✓ | ✓ |
| Create/edit draft | ✓ | ✓ |
| Launch / pause / cancel | ✓ | ✗ |
| Test send (required before launch) | ✓ | ✓ |
| Export CSV | ✓ | Read-only (optional) |

---

## 9. QA checklist (development)

### Functional
- [ ] New CRM contact receives **no** email
- [ ] Campaign draft gets id on create
- [ ] Wizard resume from deep link
- [ ] Multi-step datetime validation
- [ ] Test send required before launch (persists on draft)
- [ ] Test send invalidates when step 1 content/sender changes
- [ ] Launch sends step 1 at scheduled time
- [ ] Follow-up sends at scheduled time
- [ ] Hard bounce stops remaining steps (recipient A only)
- [ ] Soft bounce retries once; second soft stops sequence
- [ ] Unsubscribe stops remaining steps
- [ ] Reply stops remaining steps
- [ ] Spam complaint stops remaining steps + global suppress
- [ ] Other recipients continue after one stops
- [ ] contact_message resolves per recipient per source mode

### UI
- [ ] Full-screen editor on mobile (scrollable)
- [ ] Stepper keyboard accessible
- [ ] Empty states all screens
- [ ] Loading skeletons on stats
- [ ] Error toasts human-readable
- [ ] Agent step 4 shows admin-launch banner

### Security
- [ ] Agent cannot launch (API 403)
- [ ] No attachments accepted
- [ ] Webhook signatures verified

### Integration
- [ ] Resend/SendGrid/Mailgun send path
- [ ] Cron processes due steps within 2 min
- [ ] Contact profile timeline updated

---

## 10. Development sequence (locked)

1. ~~**Spec lock**~~ — stories + screen spec + API contract + migration doc ✅
2. **Backend** — schema per [marketing-module-migration.md](marketing-module-migration.md), API §7.1, job-runner, stop rules
3. **Frontend** — implement screens per this doc (Stitch HTML as layout reference)
4. **Wire** — remove CRM triggers (S6M-9), nav cleanup (S6M-35)
5. **QA after each sub-sprint** — mandatory UI + API + DB gates on **local** env; see [marketing-module-sprint-checklist.md](marketing-module-sprint-checklist.md)
6. **Epic sign-off** — §9 below + [email-marketing-standard.md](email-marketing-standard.md) DoD

---

## 11. Out of scope (v1)

- File attachments
- A/B subject tests
- Send-time timezone optimization
- CRM-triggered workflows
- Dynamic segment auto-refresh during running campaign
- Landing pages

---

*Document owner: Product / Engineering — companion visual spec: [marketing-module-design.md](marketing-module-design.md)*
