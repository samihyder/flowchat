# FlowChat — Marketing Campaign Module · Design Document

**Epic:** S6M — Marketing Campaign Redesign  
**Version:** 1.0 (locked)  
**Status:** Authoritative for frontend implementation  
**Companion docs:** [marketing-module-screens.md](marketing-module-screens.md) (screen behaviour) · [marketing-module-migration.md](marketing-module-migration.md) (schema) · [email-marketing-standard.md](email-marketing-standard.md) (checklist) · [branding.md](branding.md) (global design system)  
**Stories:** S6M-1 … S6M-44 · 185 pts · 41 Must / 3 Should  
**Last updated:** 2026-06-13

---

## 1. Module identity

### 1.1 Purpose

The Marketing module lets sales agents and admins build **multi-step email campaigns** with explicit recipients, dated sequences, enterprise-grade composition, and full deliverability analytics. Outreach is **campaign-only** — no CRM triggers.

### 1.2 Voice & tone (in-module copy)

| Principle | Example |
|-----------|---------|
| Confident, not salesy | “Launch campaign” not “Blast emails” |
| Precise about consent | “Recipients you select” not “Your audience” |
| Actionable errors | “Send a test email before launching” not “Validation failed” |
| Admin clarity | “An administrator must launch this campaign” |

### 1.3 Module icon & nav

- **Nav label:** Campaigns · Templates (not “Email automations”)
- **Nav icon:** Heroicons `EnvelopeIcon` (outline) for Marketing section header
- **Sub-nav active state:** `border-primary-500 text-primary-600` (see §2)

---

## 2. Branding & color system

Extends [branding.md](branding.md). All marketing screens use the **light dashboard shell** (white surface, gray borders) unless noted.

### 2.1 Core brand tokens (reuse globally)

| Token | Hex | Tailwind | Marketing usage |
|-------|-----|----------|-----------------|
| Primary | `#6366F1` | `primary-500` | Primary CTAs, active stepper step, links, focus rings |
| Primary hover | `#4F46E5` | `primary-600` | Button hover, stepper completed connector |
| Primary tint | `#EEF2FF` | `primary-50` | Selected table rows, merge chip hover |
| Primary border | `#C7D2FE` | `primary-200` | Active step card outline |
| Accent | `#14B8A6` | `accent-500` | Success metrics, delivered/clicked highlights |
| Heading | `#111827` | `gray-900` | Page titles, step card titles |
| Body | `#374151` | `gray-700` | Table text, form labels |
| Secondary | `#6B7280` | `gray-500` | Subtitles, metadata |
| Muted | `#9CA3AF` | `gray-400` | Placeholders, disabled |
| Surface | `#F9FAFB` | `gray-50` | Page background |
| Card | `#FFFFFF` | `white` | Cards, modals, composer body |
| Border | `#E5E7EB` | `gray-200` | Tables, inputs, dividers |

### 2.2 Marketing module accent gradient (optional hero / empty states)

```css
/* Campaign list empty state, onboarding callout */
background: linear-gradient(135deg, #EEF2FF 0%, #F0FDFA 100%);
/* brand indigo-50 → accent-50 */
```

### 2.3 Campaign status badge colors

| Status | Background | Text | Border (optional) |
|--------|------------|------|-------------------|
| `draft` | `#F3F4F6` gray-100 | `#4B5563` gray-600 | — |
| `scheduled` | `#DBEAFE` info-light | `#2563EB` info-dark | — |
| `running` | `#EEF2FF` primary-50 | `#4338CA` primary-700 | `#C7D2FE` |
| `paused` | `#FEF9C3` warning-light | `#CA8A04` warning-dark | — |
| `completed` | `#DCFCE7` success-light | `#16A34A` success-dark | — |
| `cancelled` | `#FEE2E2` danger-light | `#DC2626` danger-dark | — |

Badge spec: `rounded-full text-xs font-medium px-2.5 py-0.5` (per branding.md).

### 2.4 Recipient / subscription badges (Step 1)

| State | Background | Text |
|-------|------------|------|
| Subscribed | `#DCFCE7` | `#16A34A` |
| Suppressed / unsubscribed | `#FEE2E2` | `#DC2626` |
| Bounced | `#FEF3C7` amber-100 | `#D97706` amber-600 |
| Complained | `#FEE2E2` | `#991B1B` red-800 |

### 2.5 Recipient step & stop colors (stats / filters)

| Semantic | Color | Hex |
|----------|-------|-----|
| Sent / delivered | Accent teal | `#14B8A6` |
| Opened | Primary indigo | `#6366F1` |
| Clicked | Info blue | `#3B82F6` |
| Failed | Danger red | `#EF4444` |
| Stopped bounce | Amber | `#F59E0B` |
| Stopped unsubscribe | Gray | `#6B7280` |
| Stopped reply | Purple | `#A855F7` |
| Stopped complaint | Red | `#DC2626` |
| Skipped | Gray muted | `#9CA3AF` |

### 2.6 Pre-flight check indicators

| State | Icon color | Row background |
|-------|------------|----------------|
| Pass ✓ | `#22C55E` success | transparent |
| Fail ✗ | `#EF4444` danger | `#FEF2F2` red-50 |
| Pending | `#9CA3AF` muted | transparent |

### 2.7 Banners & alerts

| Type | Background | Border left | Text |
|------|------------|-------------|------|
| Info (agent non-admin) | `#EFF6FF` blue-50 | 4px `#3B82F6` | `#1E40AF` |
| Warning (suppressed recipients) | `#FFFBEB` amber-50 | 4px `#F59E0B` | `#92400E` |
| Error (validation) | `#FEF2F2` red-50 | 4px `#EF4444` | `#991B1B` |
| Success (test sent) | `#F0FDF4` green-50 | 4px `#22C55E` | `#166534` |

### 2.8 Merge tag chips

```
bg-primary-50 text-primary-700 border border-primary-200
rounded-full px-2.5 py-1 text-xs font-medium
hover:bg-primary-100 cursor-pointer
font-mono for token text e.g. {{first_name}}
```

### 2.9 Campaign ID display

```
font-mono text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5
copy button: ghost icon Heroicons ClipboardDocumentIcon
```

---

## 3. Typography & layout

### 3.1 Type scale (in-module)

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title (H1) | 24px / `text-2xl` | 600 | `#111827` |
| Page subtitle | 14px / `text-sm` | 400 | `#6B7280` |
| Section title (H2) | 18px / `text-lg` | 600 | `#111827` |
| Step card title | 16px / `text-base` | 600 | `#111827` |
| Table header | 12px / `text-xs` | 500 uppercase | `#6B7280` |
| Table cell | 14px / `text-sm` | 400 | `#374151` |
| Wizard stepper label | 14px | 500 active / 400 inactive | primary vs gray-500 |
| Metric value (stats) | 30px / `text-3xl` | 700 | `#111827` |
| Metric label | 12px | 500 | `#6B7280` |

Fonts: **Inter** (UI), **JetBrains Mono** (campaign ID, merge tags, API hints).

### 3.2 Layout grid

| Context | Max width | Padding |
|---------|-----------|---------|
| Campaign list | `max-w-7xl` | `px-6 py-6` |
| Wizard steps | `max-w-5xl` | `px-6 py-6` |
| Stats detail | `max-w-7xl` | `px-6 py-6` |
| Full-screen composer | `100vw` | inner `max-w-6xl mx-auto` |
| Modals | `max-w-lg` (message source) · `max-w-xl` (bulk templates) | `p-6` |

### 3.3 Spacing rhythm

- Section gap: `24px` (`gap-6`)
- Card padding: `24px` (`p-6`)
- Form field gap: `16px` (`gap-4`)
- Sticky wizard footer height: `64px` + `border-t border-gray-200 bg-white`

### 3.4 Elevation

| Element | Shadow |
|---------|--------|
| Step cards | `shadow-sm` |
| Modals | `shadow-lg` |
| Composer overlay | `shadow-xl` on top bar |
| Dropdown menus | `shadow-md` |

---

## 4. Component library (marketing-specific)

### 4.1 Marketing sub-navigation

```
Container: px-6 pt-2 border-b border-gray-200 bg-white
Tab: px-4 py-2.5 text-sm font-medium border-b-2 -mb-px
Active: border-primary-500 text-primary-600
Inactive: border-transparent text-gray-500 hover:text-gray-800
```

Stories: **S6M-35**, **S6M-40**

### 4.2 Wizard stepper

Horizontal stepper above wizard content.

| Step state | Circle | Label | Connector |
|------------|--------|-------|-----------|
| Complete | `bg-primary-500 text-white` + check icon | `text-primary-600` | `bg-primary-500` |
| Active | `border-2 border-primary-500 text-primary-600 bg-white` | `text-primary-600 font-semibold` | `bg-gray-200` |
| Upcoming | `border-2 border-gray-300 text-gray-400 bg-white` | `text-gray-400` | `bg-gray-200` |

Steps: **1 Recipients** → **2 Sequence** → **3 Sender** → **4 Review**

Click behaviour: completed steps clickable (navigate back); future steps disabled until valid.

Stories: **S6M-39**

### 4.3 Wizard header bar

```
[Editable campaign name input]  [status badge]  [campaign id + copy]
Autosave indicator: text-xs text-gray-400 "Draft saved · 2m ago"
```

Stories: **S6M-1**

### 4.4 Wizard footer bar (sticky)

```
[← Back]                    [Save draft]  [Next →]  or  [Launch campaign]
Ghost secondary              Secondary      Primary    Primary (admin only step 4)
```

Launch button: `bg-primary-500 hover:bg-primary-600` — hidden for agents on step 4.

Stories: **S6M-3**, **S6M-32**, **S6M-39**

### 4.5 Primary / secondary buttons

Per global branding — Primary indigo, Secondary white bordered, Danger red for cancel campaign.

### 4.6 Data table (recipients, campaigns)

```
Header: bg-gray-50 border-b border-gray-200
Row: border-b border-gray-100 hover:bg-gray-50
Selected row: bg-primary-50
Checkbox: rounded border-gray-300 text-primary-600 focus:ring-primary-500
Pagination: text-sm, primary link for page numbers
```

Stories: **S6M-2**, **S6M-6**, **S6M-28**

### 4.7 Sequence timeline (Step 2)

Horizontal scroll on mobile; nodes connected by `2px` line `bg-gray-200`.

- Node: circle `32px`, `bg-primary-500` when dated, `bg-gray-200` when empty
- Label below: step number + short date `text-xs text-gray-500`

Stories: **S6M-17**

### 4.8 Step card (email sequence)

```
border border-gray-200 rounded-lg p-6 bg-white shadow-sm
Active editing: ring-2 ring-primary-200 border-primary-300
```

Stories: **S6M-16**, **S6M-18**

### 4.9 Full-screen composer overlay

```
z-index: 50
bg-white fixed inset-0 flex flex-col
Top bar: h-14 border-b border-gray-200 px-6 flex items-center gap-4
Editor area: flex-1 overflow-y-auto px-6 py-4
Right rail (lg+): w-80 border-l border-gray-200 p-4 bg-gray-50
Bottom bar: h-16 border-t border-gray-200 px-6 flex items-center justify-between
```

Rich editor min-height: `60vh`. Preview toggle switches body to read-only rendered HTML with sample merge data.

**No attachment button** — absent from toolbar (S6M-20).

Stories: **S6M-12**, **S6M-11**, **S6M-15**, **S6M-13**

### 4.10 Modals

Backdrop: `bg-black/40`. Panel: `bg-white rounded-xl shadow-lg`.

| Modal | Width | Primary action |
|-------|-------|----------------|
| Message source (§4.3.1) | `max-w-lg` | Save source mode |
| Bulk templates (§4.3.2) | `max-w-xl` | Add N steps |
| Launch confirm | `max-w-md` | Launch campaign |
| Pause / Cancel | `max-w-md` | Destructive or confirm |

Stories: **S6M-19**, **S6M-16**, **S6M-3**, **S6M-4**

### 4.11 Stats funnel (Overview tab)

Horizontal funnel or metric cards row:

```
Metric card: bg-white border border-gray-200 rounded-lg p-4
Value: text-3xl font-bold text-gray-900
Label: text-xs font-medium text-gray-500 uppercase tracking-wide
Trend optional: text-sm text-accent-600
```

Progress bar (running): `h-2 bg-gray-200 rounded-full`; fill `bg-primary-500`.

Stories: **S6M-26**

### 4.12 Expandable recipient row

Chevron rotates 90° on expand; nested timeline uses left border `2px solid #E5E7EB` and dots colored by step status (§2.5).

Stories: **S6M-43**

### 4.13 Toast notifications

- Save: “Draft saved” — neutral gray
- Error: mapped from MarketingError codes (§7) — danger
- Launch: “Campaign launched” — success green

Stories: **S6M-31**, **S6M-39**

---

## 5. Screen designs

Behaviour detail: [marketing-module-screens.md](marketing-module-screens.md). Below: visual specification per screen.

### 5.1 Campaign list (`/dashboard/marketing/campaigns`)

**S6M-2**, **S6M-5** (duplicate action)

| Zone | Design |
|------|--------|
| Header | H1 + subtitle; primary CTA right-aligned `+ New campaign` |
| Optional metrics | 4-column card row, equal width, `gap-4` |
| Table | Full width within `max-w-7xl` |
| Empty state | Centered illustration (envelope + calendar motif), gradient §2.2, CTA primary |
| Row menu | `⋮` ghost button → dropdown shadow-md |

### 5.2 Wizard Step 1 — Recipients

**S6M-1**, **S6M-6**, **S6M-7**, **S6M-8**, **S6M-10**

| Zone | Design |
|------|--------|
| Search | Full-width input with magnifier icon, `mb-4` |
| Segment import | Secondary outlined panel below search, `bg-gray-50 rounded-lg p-4` |
| Table | Checkbox column `48px`; status badges §2.4 |
| Sticky summary footer | `fixed bottom-16` above wizard footer; `bg-primary-50 border-t border-primary-200` when recipients selected |
| Suppression warning | Warning banner §2.7 when suppressed in selection |

### 5.3 Wizard Step 2 — Sequence

**S6M-16**, **S6M-17**, **S6M-18**, **S6M-19**, **S6M-20**, **S6M-41**

| Zone | Design |
|------|--------|
| Timeline | Top of content, `mb-6` |
| Step cards | Stack `gap-6` |
| Date/time pickers | Native or shadcn calendar + time; inline error `text-danger text-sm` |
| “Open full-screen editor” | Secondary button with `PencilSquareIcon` |
| Validation errors | Red border on offending step card + banner top |

### 5.4 Wizard Step 3 — Sender & signature

**S6M-21**, **S6M-22**, **S6M-25**

| Zone | Design |
|------|--------|
| Sender fields | 2-column grid desktop, 1-column mobile |
| Provider read-only | `text-sm text-gray-500 bg-gray-50 rounded px-3 py-2 font-mono` |
| Signature editor | Min height `200px` rich text |
| Footer preview | Bordered box `bg-gray-50 rounded-lg p-4`; compliance block `text-gray-400 text-xs` |

### 5.5 Wizard Step 4 — Review & launch

**S6M-3**, **S6M-10**, **S6M-23**, **S6M-24**, **S6M-32**

| Zone | Design |
|------|--------|
| Pre-flight table | 2-column: check name + status icon §2.6 |
| Test send block | Bordered card; success state green left border when `test_valid` |
| Agent banner | Info banner §2.7 when non-admin |
| Launch button | Primary large; **not rendered** for agents |
| Summary table | Compact `text-sm` |

### 5.6 Campaign stats detail

**S6M-26**, **S6M-27**, **S6M-28**, **S6M-29**, **S6M-43**

| Zone | Design |
|------|--------|
| Header | Title + status badge; action buttons right (Pause, Cancel, Export) |
| Metadata row | `text-sm text-gray-500`; launched by/at |
| Tabs | Underline style matching marketing sub-nav |
| Overview | Metric cards + funnel |
| Email steps | Card per step `gap-4` |
| Recipients | Full table + filter chips `rounded-full` |
| Activity log | Monospace timestamps `text-xs`; event type badge |

### 5.7 Template library

**S6M-11**, **S6M-12**

Grid or table of templates; same composer overlay as wizard. Archive action in row menu (muted danger).

### 5.8 Settings — Marketing health

**S6M-24**, **S6M-33**

Section at bottom of `/settings/email-marketing`. Card layout matching other settings pages. Link outs in primary color to Connected services.

---

## 6. Interaction & motion

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button hover | 100ms | standard |
| Stepper step change | 200ms | enter |
| Modal open/close | 200ms | enter / exit |
| Composer overlay | 300ms slide-up or fade | enter |
| Toast | 200ms fade | — |
| Row expand | 200ms height | standard |

Autosave toast: debounce 30s + on step change; non-blocking bottom-right.

---

## 7. Error handling (UI)

Maps to [marketing-module-screens.md §3.1](marketing-module-screens.md). Display pattern:

- **Inline:** `border-danger` on field + `text-sm text-danger` below
- **Banner:** full-width alert §2.7 at top of wizard step
- **Toast:** for network/save failures
- **Never** show raw JSON or provider stack traces

Story: **S6M-31**

---

## 8. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Stepper | `aria-current="step"` on active; keyboard Tab through steps |
| Tables | `<th scope="col">`; sortable headers announce state |
| Modals | Focus trap; `aria-modal`; Esc closes |
| Composer | Toolbar buttons `aria-label`; preview toggle announces mode |
| Status badges | `aria-label` includes status text, not color alone |
| Color contrast | All text pairs ≥ WCAG AA on white/`gray-50` backgrounds |
| Launch confirm | Focus on Cancel first for destructive-adjacent flow |

Story: **S6M-40**

---

## 9. Responsive behaviour

| Breakpoint | Behaviour |
|------------|-----------|
| `< md` | Wizard stepper vertical or scroll horizontal; composer right rail below editor |
| `md+` | 2-column sender form; composer side rail visible |
| `< lg` | Stats tables horizontal scroll |
| All | Wizard footer sticky; touch targets min 44px |

---

## 10. Requirements traceability (R1–R20)

| # | Requirement | Stories | Design § |
|---|-------------|---------|----------|
| R1 | No email on contact create | S6M-9 | §11 |
| R2 | Marketing tab only | S6M-9, S6M-35 | §4.1, §12 |
| R3 | Campaign ID on create | S6M-1 | §4.3, §5.2 |
| R4 | Explicit recipients | S6M-6, S6M-10 | §5.2, §5.5 |
| R5 | Segment import shortcut | S6M-7 | §5.2 |
| R6 | Multi-step + datetime | S6M-16–18, S6M-39 | §4.7–4.8, §5.3 |
| R7 | Templates + save-as | S6M-11–13 | §4.9, §5.7 |
| R8 | Full-screen composer | S6M-12 | §4.9 |
| R9 | Merge tags + message mode | S6M-15, S6M-19, S6M-41 | §2.8, §4.10 |
| R10 | Signature + footer links | S6M-21–22, S6M-25 | §5.4 |
| R11 | Mandatory test send | S6M-23 | §5.5 |
| R12 | Admin-only launch | S6M-3, S6M-32 | §4.4, §5.5 |
| R13 | Pre-flight + cron | S6M-24, S6M-33 | §2.6, §5.5, §5.8 |
| R14 | No attachments | S6M-20 | §4.9 |
| R15 | Stop rules | S6M-36–38, S6M-42, S6M-44 | §2.5, §11 |
| R16 | Stats + drill-down | S6M-26–29, S6M-43 | §5.6 |
| R17 | Safe errors | S6M-31 | §7 |
| R18 | BYOK + webhooks | S6M-24, S6M-34 | §5.4, §5.8 |
| R19 | Snapshot at launch | S6M-14 | §13 |
| R20 | Bulk multi-template | S6M-16 | §4.10 |

---

## 11. Product rules (visualised)

### Stop rules

When bounce, unsubscribe, reply, or complaint: recipient row shows stopped badge (§2.5); remaining steps greyed in expand timeline. Other recipients unchanged.

### CRM isolation (S6M-9)

No UI for CRM-triggered enrollment. Contact profile timeline shows campaign events only (accent/indigo icons).

### RBAC (S6M-32)

| Role | Launch | Pause/Cancel | Test send | Export |
|------|--------|--------------|-----------|--------|
| Admin | ✓ visible | ✓ | ✓ | ✓ |
| Agent | Hidden + banner | ✗ | ✓ | Optional read-only |

---

## 12. Information architecture & routes

```
Marketing
├── Campaigns     /dashboard/marketing/campaigns
├── Templates     /dashboard/marketing/templates
└── Segments      /dashboard/marketing/segments (optional)

Settings → Email marketing    /settings/email-marketing
Settings → Connected services (BYOK)
```

**Removed:** `/dashboard/marketing/workflows`, “Email automations” nav label.

Breadcrumbs: `Marketing → Campaigns → [Campaign name]`

Story: **S6M-35**, **S6M-40**

---

## 13. Data & API (design-facing)

- **Enums:** [marketing-module-screens.md §1.2](marketing-module-screens.md)
- **Fields:** [marketing-module-screens.md §1.3](marketing-module-screens.md)
- **API:** [marketing-module-screens.md §7.1](marketing-module-screens.md)
- **Schema:** [marketing-module-migration.md](marketing-module-migration.md)

---

## 14. Complete user stories (S6M-1 … S6M-44)

### Campaign lifecycle

#### S6M-1 · Campaign ID on create · Agent · Must · 5 pts
**Story:** As a Sales agent, I want to create a marketing campaign draft that receives a campaign ID immediately, so that I can save progress and return later.

**Acceptance criteria:**
- Wizard step 0 saves draft via POST /marketing/campaigns
- Response includes campaign id displayed in UI
- Draft persists name, owner, created_at
- Deep link `/marketing/campaigns/:id/edit?step=N` resumes wizard

**Design:** §4.3 wizard header, §5.2, campaign ID mono chip §2.9

---

#### S6M-2 · Campaign list · Agent · Must · 3 pts
**Story:** As a Sales agent, I want a campaigns list with status filters, so that I can find drafts, running, and completed outreach.

**Acceptance criteria:**
- Marketing home lists campaigns with status badges: draft, scheduled, running, paused, completed, cancelled
- Filter by status and search by name
- Shows recipient count and next scheduled send

**Design:** §2.3 badges, §4.6 table, §5.1

---

#### S6M-3 · Admin launch · Admin · Must · 5 pts
**Story:** As an Admin, I want to launch a campaign after review, so that scheduled emails begin processing in the background.

**Acceptance criteria:**
- Only administrator role can launch
- Launch validates pre-flight checks (provider, test send, recipients)
- Status moves draft → scheduled/running
- Background job enqueues step 1 per recipient
- Audit: launched_by user id + launched_at timestamp stored on campaign; shown on stats header

**Design:** §5.5 launch modal, §5.6 metadata row

---

#### S6M-4 · Pause / cancel · Admin · Must · 3 pts
**Story:** As an Admin, I want to pause or cancel a running campaign, so that no further steps send until I decide.

**Acceptance criteria:**
- Pause stops new sends; in-flight batch completes
- Cancel marks campaign cancelled; pending recipient steps skipped
- Confirmation modals show recipient impact summary
- Activity log records pause/cancel events

**Design:** §4.10 modals, danger button for cancel

---

#### S6M-5 · Duplicate campaign · Agent · Should · 3 pts
**Story:** As a Sales agent, I want to duplicate a completed campaign as a new draft, so that I can repeat outreach with a new schedule.

**Acceptance criteria:**
- Duplicate copies steps and templates (snapshot) not live template links
- Recipients not copied; test-send and launch audit reset
- New campaign id assigned; redirect to edit step 2 to reschedule

**Design:** §5.1 row menu action

---

#### S6M-39 · Wizard navigation · Agent · Must · 5 pts
**Story:** As a Sales agent, I want wizard step navigation with saved progress, so that I can complete a campaign across sessions.

**Acceptance criteria:**
- Steps: Recipients → Sequence → Sender → Review
- Back/next preserves data; autosave on step change
- Invalid step cannot proceed; errors inline

**Design:** §4.2 stepper, §4.4 footer, autosave toast §6

---

### Recipients & CRM isolation

#### S6M-6 · Recipient multi-select · Agent · Must · 5 pts
**Story:** As a Sales agent, I want to select multiple email recipients in the campaign wizard, so that only chosen contacts receive the sequence.

**Acceptance criteria:**
- Step 1: search CRM contacts with email
- Multi-select with select-all on page
- At least one recipient required to proceed
- Selected count shown on review step

**Design:** §5.2 table, sticky summary

---

#### S6M-7 · Segment import · Agent · Should · 3 pts
**Story:** As a Sales agent, I want to load recipients from a static segment, so that I can reuse a campaign list without auto-emailing new CRM contacts.

**Acceptance criteria:**
- Optional “Import from segment” on step 1
- Merges segment members into selection; user can deselect individuals
- Dynamic segments show preview count before import

**Design:** §5.2 segment panel (gray-50 box)

---

#### S6M-8 · Suppression warnings · Agent · Must · 3 pts
**Story:** As a Sales agent, I want warnings for suppressed or invalid recipients, so that I do not accidentally include bounced or unsubscribed contacts.

**Acceptance criteria:**
- Suppressed/unsubscribed/bounced contacts flagged in picker
- Launch blocks sends to suppressed addresses
- Summary shows excluded count with reasons

**Design:** §2.4 badges, §2.7 warning banner

---

#### S6M-9 · No CRM triggers · Platform · Must · 5 pts
**Story:** As a Platform, I want no marketing email triggered on contact create/import/chat, so that outreach only starts from the Marketing module.

**Acceptance criteria:**
- Remove triggerMarketingWorkflows on contact_created from: manual CRUD, CSV import, LeadSnapper/integration upsert, widget session create
- Remove conversation_resolved and label_added auto-enroll from marketing
- Legacy workflow UI hidden or admin-only deprecated
- CRM contacts unaffected when added via any medium; double opt-in transactional mail is not a marketing campaign

**Design:** §12 nav removal; no enrollment UI on contact profile

---

#### S6M-10 · Review recipients · Agent · Must · 2 pts
**Story:** As a Sales agent, I want a review step showing all recipients before launch, so that I can confirm the audience.

**Acceptance criteria:**
- Step 4 lists recipient names and emails (paginated)
- Shows subscribed-only confirmation
- Edit recipients link returns to step 1

**Design:** §5.5 section D

---

#### S6M-35 · Nav cleanup · Admin · Must · 3 pts
**Story:** As an Admin, I want legacy CRM-triggered workflows removed from Marketing navigation, so that agents only use the campaign wizard.

**Acceptance criteria:**
- Nav: Campaigns, Templates only (segments optional sub-link)
- /marketing/workflows and old automations redirect or 410
- Docs updated

**Design:** §4.1, §12

---

### Templates & composer

#### S6M-11 · Template library · Agent · Must · 5 pts
**Story:** As a Sales agent, I want a template library independent of campaigns, so that I can build reusable email content ahead of time.

**Acceptance criteria:**
- Marketing → Templates: list, create, edit, archive, duplicate
- Templates have name, subject, html_body, plain text fallback auto-generated from HTML on save (editable)
- No campaign required to save a template

**Design:** §5.7, §4.9 plain text collapse

---

#### S6M-12 · Full-screen composer · Agent · Must · 8 pts
**Story:** As a Sales agent, I want a full-screen enterprise email composer, so that I can write professional HTML emails with focus.

**Acceptance criteria:**
- Composer opens full viewport overlay from wizard or template library
- Rich text: headings, bold, links, lists, undo
- Subject line field above body
- Mobile-safe preview toggle
- Escape/minimize returns to wizard without losing draft

**Design:** §4.9

---

#### S6M-13 · Save as template · Agent · Must · 3 pts
**Story:** As a Sales agent, I want a checkbox to save an email as a template during the campaign wizard, so that I can reuse content on future campaigns.

**Acceptance criteria:**
- Per sequence step: “Save as template” with name field
- On launch, creates template if checked
- Template library shows source campaign metadata optional

**Design:** §4.9 bottom bar

---

#### S6M-14 · Snapshot at launch · Platform · Must · 3 pts
**Story:** As a Platform, I want campaign email content snapshotted at launch, so that later template edits do not change in-flight campaigns.

**Acceptance criteria:**
- campaign_steps store subject/html snapshot per step
- Editing library template does not alter running campaign
- Duplicate campaign copies snapshots

**Design:** No UI change; running campaign shows read-only content in stats

---

#### S6M-15 · Merge tag chips · Agent · Must · 5 pts
**Story:** As a Sales agent, I want merge tag chips in the composer, so that I can insert personalization tokens without typing syntax.

**Acceptance criteria:**
- Chips: first_name, last_name, email, phone, contact_message, meeting_link, portfolio_link, agent_name, agent_email
- Insert at cursor in subject or body
- Preview mode renders sample contact

**Design:** §2.8 right rail

---

#### S6M-20 · No attachments · Platform · Must · 2 pts
**Story:** As a Platform, I want file attachments disabled in marketing emails, so that campaigns stay lightweight and compliant.

**Acceptance criteria:**
- No attachment UI in composer
- API rejects attachment payloads on campaign send
- QA checklist includes negative test

**Design:** Toolbar excludes paperclip; §4.9

---

### Email sequence

#### S6M-16 · Multi-step sequence · Agent · Must · 5 pts
**Story:** As a Sales agent, I want to add multiple follow-up emails in one campaign, so that I can run dated sequences.

**Acceptance criteria:**
- Step 2: add/remove email rows (min 1)
- Each row: pick one template or write from scratch
- Optional bulk apply: select multiple templates at once → creates one step per template with default schedule spacing
- Sequence order preserved as step_order

**Design:** §4.8, §4.10 bulk modal

---

#### S6M-17 · Date+time per step · Agent · Must · 5 pts
**Story:** As a Sales agent, I want to set an explicit date and time for each email, so that scheduling is fully under my control.

**Acceptance criteria:**
- Date+time picker per step; no system timezone preference for scheduling UI
- Display shows agent-selected datetime as stored (UTC backend)
- Timeline preview visualizes all steps

**Design:** §4.7 timeline

---

#### S6M-18 · Schedule validation · Agent · Must · 3 pts
**Story:** As a Sales agent, I want validation that each follow-up is scheduled after the previous email, so that the sequence order is logical.

**Acceptance criteria:**
- Step N send_at > step N-1 send_at
- All send_at must be in the future at launch
- Clear inline error on violation

**Design:** Inline danger text on step card

---

#### S6M-19 · contact_message source · Agent · Must · 5 pts
**Story:** As a Sales agent, I want to pick a contact message for the contact_message merge field, so that emails reference a specific note or chat message.

**Acceptance criteria:**
- Per step with {{contact_message}}: agent selects source mode (latest_note, latest_inbound_chat, latest_note_or_chat)
- Wizard preview uses sample contact; send-time resolution is per recipient
- merge_config stored on campaign_step; empty resolution omits token
- Source mode required before launch when token present

**Design:** §4.10 message source modal

---

#### S6M-41 · Merge validation · Agent · Must · 3 pts
**Story:** As a Sales agent, I want mandatory merge-field validation before launch, so that every email includes required personalization.

**Acceptance criteria:**
- Each step body must include {{first_name}}
- If {{contact_message}} appears, source mode must be configured
- {{phone}} and empty {{contact_message}} omitted when absent
- Validation errors list all steps before launch

**Design:** Step-level error banner; highlight offending cards

---

### Signature & compliance

#### S6M-21 · Signature block · Agent · Must · 5 pts
**Story:** As a Sales agent, I want a proper signature block after my name in the footer, so that emails look professional.

**Acceptance criteria:**
- Step 3: signature rich editor or workspace default
- Rendered after body: agent name → signature HTML
- Validation: signature or workspace default required

**Design:** §5.4 signature editor + preview

---

#### S6M-22 · Meeting/portfolio links · Agent · Must · 3 pts
**Story:** As a Sales agent, I want meeting and portfolio links in the footer, so that recipients can book or view our work.

**Acceptance criteria:**
- meeting_link and portfolio_link merge tags from workspace settings; overridable per campaign
- Appended in footer block after signature
- Preview shows resolved URLs

**Design:** §5.4 footer link inputs

---

#### S6M-23 · Mandatory test send · Agent · Must · 5 pts
**Story:** As a Sales agent, I must send a test email before an admin launches the campaign, so that content and deliverability are verified.

**Acceptance criteria:**
- Launch disabled until test succeeded for this campaign draft (persists across sessions until content/sender changes invalidate)
- Agent or admin can trigger test; uses step 1 content with logged-in user as merge sample
- Test send logged: test_sent_at, test_sent_by, test_sent_to

**Design:** §5.5 test send card; green success state §2.7

---

#### S6M-24 · Pre-flight panel · Admin · Must · 5 pts
**Story:** As an Admin, I want a pre-flight panel showing email provider and cron health, so that I know the system can send before launch.

**Acceptance criteria:**
- Checks: connected Resend/SendGrid/Mailgun or platform key; domain verified; last cron success < 2 min
- Failures show actionable messages
- Shown on review step and Settings → Email marketing

**Design:** §2.6, §5.5, §5.8

---

#### S6M-25 · Compliance footer · Platform · Must · 3 pts
**Story:** As a Platform, I want unsubscribe and physical address footer on every marketing email, so that we stay compliant.

**Acceptance criteria:**
- System appends List-Unsubscribe header and footer link
- Physical address from workspace settings
- Cannot be removed by agent; preview shows footer

**Design:** §5.4 read-only compliance preview `text-gray-400`

---

#### S6M-32 · Admin-only launch RBAC · Admin · Must · 3 pts
**Story:** As an Admin, I want only administrators to launch campaigns, so that outbound email is controlled.

**Acceptance criteria:**
- Agents can build drafts; launch requires administrator role
- API enforces RBAC on launch/pause/cancel
- Agents on step 4 see info banner + Launch button hidden; test send and Save draft remain available

**Design:** §5.5 agent banner §2.7; hidden primary CTA

---

### Analytics

#### S6M-26 · Overview + activity log · Agent · Must · 5 pts
**Story:** As a Sales agent, I want a campaign overview with funnel metrics, so that I see performance at a glance.

**Acceptance criteria:**
- Detail page: sent, delivered, opened, clicked, bounced, unsubscribed, complained, stopped counts
- Aggregate open/click rates
- Live progress during running state
- Activity log tab: chronological send attempts, webhook events, skips, sanitized errors

**Design:** §4.11, §5.6 Overview + Activity tabs

---

#### S6M-27 · Per-step stats · Agent · Must · 5 pts
**Story:** As a Sales agent, I want per-email-step statistics, so that I know which follow-up performs best.

**Acceptance criteria:**
- Tab or section per step: subject, scheduled time, sent count, open %, click %
- Stopped-by-bounce/reply/unsub/complaint counts per step

**Design:** §5.6 Email steps tab

---

#### S6M-28 · Recipient table · Agent · Must · 5 pts
**Story:** As a Sales agent, I want a recipient table with filters, so that I can see who opened, clicked, or stopped.

**Acceptance criteria:**
- Columns: contact, email, per-step status, stopped_reason, last event time
- Filters: opened, not_opened, clicked, bounced, stopped_bounce, stopped_unsubscribe, stopped_reply, stopped_complaint
- Link to contact profile

**Design:** §5.6 Recipients tab, filter chips

---

#### S6M-29 · CSV export · Admin · Should · 3 pts
**Story:** As an Admin, I want to export campaign results as CSV, so that I can report offline.

**Acceptance criteria:**
- Export recipient × step × status × timestamps
- Includes stopped_reason column
- Download from campaign detail

**Design:** §5.6 Export secondary button in header

---

#### S6M-30 · Contact timeline · Agent · Must · 3 pts
**Story:** As a Sales agent, I want campaign emails on the contact profile timeline, so that CRM and marketing stay connected.

**Acceptance criteria:**
- Contact profile shows campaign name, step, sent/opened/clicked/stopped events
- Consistent with campaign detail recipient row

**Design:** Timeline icons indigo/teal; same status colors §2.5

---

#### S6M-43 · Per-recipient drill-down · Agent · Must · 5 pts
**Story:** As a Sales agent, I want a per-recipient per-email-step detail view, so that I can see exactly what happened for each follow-up.

**Acceptance criteria:**
- Recipient row expands or drill-down shows each step: scheduled time, sent time, delivered, opened, clicked, step status, stopped_reason
- Links to provider message id (admin)
- Matches contact profile timeline events

**Design:** §4.12 expandable row

---

### Infrastructure

#### S6M-31 · Safe errors · Platform · Must · 5 pts
**Story:** As a Platform, I want try/catch and safe error messages across the marketing module, so that failures never expose raw provider responses.

**Acceptance criteria:**
- MarketingError codes mapped to UI strings per marketing-module-screens.md §3.1
- API returns { error, code }; no stack traces to client
- Failed sends retried with cap; logged server-side

**Design:** §7

---

#### S6M-33 · Cron / worker · Platform · Must · 8 pts
**Story:** As a Platform, I want the cron/worker to process campaign steps by scheduled time, so that follow-ups send reliably in the background.

**Acceptance criteria:**
- job-runner processes campaign_recipient_steps where send_at <= now
- Idempotent: same step+recipient never double-sent
- Primary: Railway worker polls GET /api/cron/marketing every ~60s
- Backup: Vercel Cron every 5 min when worker unavailable
- Health panel shows last successful cron timestamp

**Design:** §5.8 cron row in pre-flight; see infrastructure.md

---

#### S6M-34 · Delivery webhooks · Platform · Must · 5 pts
**Story:** As a Platform, I want delivery webhooks from Resend/SendGrid/Mailgun to update stats, so that opens and bounces reflect within minutes.

**Acceptance criteria:**
- Per-credential webhook URLs ingest delivered, opened, clicked, bounced, complained
- Updates campaign_recipient_step status and contact_email_events
- Webhook signature verified

**Design:** Activity log entries; stats live update

---

### Stop rules

#### S6M-36 · Hard/soft bounce · Platform · Must · 5 pts
**Story:** As a Platform, I want hard bounces to stop all remaining follow-ups for that recipient in the campaign, so that we do not mail invalid addresses.

**Acceptance criteria:**
- Hard/permanent bounce: stopped_reason=bounce; pending steps status=stopped_bounce
- Soft bounce: retry once after 4h; second failure treated as hard bounce
- Global suppress on hard bounce
- Other recipients continue

**Design:** §2.5 amber stopped_bounce

---

#### S6M-37 · Unsubscribe stop · Platform · Must · 3 pts
**Story:** As a Platform, I want unsubscribes to stop all remaining follow-ups for that email address in the campaign, so that opt-out is honoured immediately.

**Acceptance criteria:**
- Unsubscribe link suppresses globally and stops pending campaign steps
- stopped_reason=unsubscribe; steps status=stopped_unsubscribe
- Launch already blocks suppressed addresses

**Design:** §2.5 gray stopped_unsubscribe

---

#### S6M-38 · Reply stop · Platform · Must · 8 pts
**Story:** As a Platform, I want replies from the recipient email address to stop remaining follow-ups in that campaign, so that engaged contacts are not over-mailed.

**Acceptance criteria:**
- Primary: inbound reply matched via In-Reply-To/References to outbound Message-ID (Sprint 7 inbox)
- Fallback: provider reply webhook if supported
- stopped_reason=reply; steps status=stopped_reply
- Reply does not stop other campaigns or recipients

**Design:** §2.5 purple stopped_reply

---

#### S6M-42 · Send engine skip · Platform · Must · 3 pts
**Story:** As a Platform, I want the send engine to skip stopped recipients before each step, so that cancelled follow-ups never dispatch.

**Acceptance criteria:**
- Before send: if stopped_reason set, skip pending steps (status=skipped)
- Cron idempotent check respects stopped state
- Stats and activity log record skip reason

**Design:** Activity log “skipped” entries; §2.5 skipped gray

---

#### S6M-44 · Spam complaint · Platform · Must · 3 pts
**Story:** As a Platform, I want spam complaints to stop remaining follow-ups and suppress the address globally, so that deliverability matches ESP industry practice.

**Acceptance criteria:**
- On complained webhook: global suppress + stopped_reason=complaint
- Pending steps status=stopped_complaint
- Admin alert or activity log entry
- Stats aggregate stopped_complaint count

**Design:** §2.5 red stopped_complaint

---

### UX consistency

#### S6M-40 · UX consistency · Agent · Must · 3 pts
**Story:** As a Sales agent, I want consistent Marketing UI connected to CRM, so that the module feels enterprise-grade.

**Acceptance criteria:**
- Shared dashboard shell, typography, settings cards pattern
- Breadcrumbs: Marketing → Campaigns → [name]
- Contact links open CRM profile in same tab
- QA pass on responsive breakpoints

**Design:** §3, §9, §8; inherit dashboard shell from global app

---

## 15. Merge tags (reference)

| Tag | Required | Design note |
|-----|----------|-------------|
| `{{first_name}}` | Yes in every step body | Chip §2.8 |
| `{{last_name}}` | No | |
| `{{email}}` | No | |
| `{{phone}}` | No; omit if empty | |
| `{{contact_message}}` | Source mode if used | Modal §4.10 |
| `{{meeting_link}}` | No | Footer preview |
| `{{portfolio_link}}` | No | Footer preview |
| `{{agent_name}}` | No | |
| `{{agent_email}}` | No | |

Footer render order: body → agent name → signature → links → compliance (system, gray).

---

## 16. QA checklist (design verification)

### Visual
- [ ] All status badges use §2.3 colors consistently
- [ ] Primary CTAs use `#6366F1` only (no off-brand purple)
- [ ] Composer has no attachment control
- [ ] Agent step 4: Launch hidden, info banner visible
- [ ] Stopped reasons use §2.5 semantic colors in timeline

### Functional
- [ ] All §14 acceptance criteria met per story
- [ ] WCAG AA contrast on badges and banners
- [ ] Mobile composer usable (rail below editor)
- [ ] Empty states use §2.2 gradient

### Integration
- [ ] Contact profile timeline matches stats expand row
- [ ] Pre-flight mirrors Settings health panel
- [ ] Error codes show human copy never raw JSON

Full functional QA: [marketing-module-screens.md §9](marketing-module-screens.md).

---

## 17. Out of scope (v1)

- File attachments
- A/B subject tests
- Send-time timezone optimization
- CRM-triggered workflows / workflow builder UI
- Dynamic segment auto-refresh during running campaign
- Landing pages
- HTML wireframe files (spec-only delivery)

---

## 18. Document index

| Document | Role |
|----------|------|
| **marketing-module-design.md** (this file) | Visual design, branding, components, all stories |
| marketing-module-screens.md | Screen behaviour, API, enums |
| marketing-module-migration.md | Database schema |
| email-marketing-standard.md | Completion checklist |
| branding.md | Global FlowChat design system |
| infrastructure.md | Cron/worker runbook |

---

*Document owner: Product / Design / Engineering — S6M locked 2026-06-13*
