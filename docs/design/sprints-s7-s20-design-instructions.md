# FlowChat — Design Instructions · Sprints S7–S17 & S20

> **Scope:** Multi-channel → Automation & AI → Knowledge & campaigns → Enterprise → Hardening.  
> **Excluded:** S18–S19 (Expo mobile).  
> **Audience:** Designers, frontend, and product implementing or polishing UI for these sprints.  
> **Source of truth for color:** Live app tokens in `apps/web/src/app/globals.css` + `marketing-tokens.css` (**Mutex Systems aqua / turquoise**).  
> **Note:** `docs/branding.md` still documents legacy indigo (`#6366F1`). **Do not use indigo as primary** for S7–S20 work. Use the palette below.

**Related:** [sprints.md](../sprints.md) · [branding.md](../branding.md) (legacy) · [MUTEX_SYSTEMS_SETUP.md](../MUTEX_SYSTEMS_SETUP.md)

---

## 0. Brand & product shell (apply to every sprint)

### 0.1 Product identity

| Item | Value |
|------|--------|
| Product | FlowChat (Mutex Systems) |
| Voice | Confident, warm, efficient — technical enough to trust, human enough to love |
| Tagline | *Every conversation in flow.* |
| App surface | Light dashboard (`#F9FAFB`), dark teal sidebar |

### 0.2 Color system (current — Mutex aqua)

Use Tailwind `primary-*` / `accent-*` / `sidebar-*` classes from `@theme` in `globals.css`.

#### Primary (cyan / aqua)

| Token | Hex | Use |
|-------|-----|-----|
| `primary-50` | `#ECFEFF` | Page tint, soft panels, selected row wash |
| `primary-100` | `#CFFAFE` | Selection background, `::selection` |
| `primary-200` | `#A5F3FC` | Soft borders (`primary-border`) |
| `primary-300` | `#67E8F9` | Disabled / fixed-dim accents |
| `primary-400` | `#2DD4BF` | Secondary brand highlight |
| `primary-500` | `#06B6D4` | **PRIMARY** — buttons, links, focus, badges |
| `primary-600` | `#0891B2` | Hover / pressed primary |
| `primary-700` | `#0E7490` | Strong text on tint |
| `primary-800` | `#155E75` | Dark emphasis |
| `primary-900` | `#164E63` | Deepest text on light tint |

#### Accent (teal)

| Token | Hex | Use |
|-------|-----|-----|
| `accent-50` / `100` | `#F0FDFA` / `#CCFBF1` | Success-adjacent washes, AI highlight surfaces |
| `accent-500` | `#2DD4BF` | Online status, AI spark accents |
| `accent-600` | `#14B8A6` | Accent text / chips |

#### Sidebar (dashboard chrome)

| Token | Hex | Use |
|-------|-----|-----|
| `sidebar-bg` | `#134E4A` | Left nav background |
| `sidebar-hover` | `#115E59` | Active / hover nav row |
| `sidebar-text` | `#CCFBF1` | Default nav label |
| `sidebar-muted` | `#5EEAD4` | Secondary nav chrome |
| `sidebar-label` | `#2DD4BF` | Section uppercase labels |

#### Neutrals & semantic

| Role | Hex / Tailwind | Use |
|------|----------------|-----|
| Page bg | `#F9FAFB` (`gray-50`) | Dashboard content |
| Surface | `#FFFFFF` | Cards, panels, headers |
| Border | `#E5E7EB` (`gray-200`) | Dividers, inputs |
| Body | `#374151` / heading `#111827` | Text |
| Success | `#22C55E` | Resolved, delivered |
| Warning | `#EAB308` | Pending, SLA warning |
| Danger | `#EF4444` | Errors, urgent, breaches |
| Info | `#3B82F6` | Neutral info |

#### Conversation / agent maps (keep)

```
Priority:  urgent #EF4444 · high #F97316 · medium #EAB308 · low #22C55E
Status:    open primary-500 · pending orange · snoozed purple-500 · resolved green
Presence:  online accent-500 · busy amber-400 · offline gray-400
```

**Gradients (allowed sparingly):** soft headers `from-primary-50 via-cyan-50 to-white`; document/action ribbons may use `from-primary-600 to-teal-700`. Avoid purple/indigo hero themes and heavy glow.

### 0.3 Typography

| Role | Spec |
|------|------|
| Font | `'Inter', system-ui, -apple-system, sans-serif` |
| Mono | `'JetBrains Mono', ui-monospace, monospace` (IDs, JSON, metrics) |
| Icons | Material Symbols Outlined (dashboard) + emoji/glyph sparingly in sidebar; Heroicons/Lucide OK for new chrome |
| Page title | `text-base font-semibold text-gray-900` in sticky header, or `text-xl font-bold` in content |
| Subtitle | `text-xs text-gray-500` |
| Section label | `text-[10px] font-bold uppercase tracking-wider text-sidebar-label` (nav) / `text-gray-500` (content) |
| Body | `text-sm` (14px) default in app |

### 0.4 Layout shell (all dashboard pages)

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar 240px (sidebar-bg) │ Main column (flex-1, min-h-0)  │
│  Account + logo            │ ┌─ Sticky header h-14 ───────┐ │
│  Conversations             │ │ Title + subtitle + actions │ │
│  CRM / Marketing / Docs    │ └────────────────────────────┘ │
│  Reports / Campaigns       │ ┌─ Scrollable content ───────┐ │
│  Settings link             │ │ p-4 sm:p-6, max-w as needed│ │
│  Agent availability        │ └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Rules**

1. **One job per page section** — one H1/title, one short supporting line, one primary CTA group.
2. **Sticky page header** — `h-14 bg-white border-b border-gray-200 px-5 flex items-center justify-between`.
3. **Content** — `flex-1 overflow-y-auto`; cards `bg-white border border-gray-200 rounded-xl`.
4. **No card soup in heroes** — cards only when they wrap an interaction (form, list row, metric).
5. **4px grid** — padding `p-4`/`p-5`/`p-6`; gaps `gap-3`/`gap-4`.
6. **Radius** — controls `rounded-lg`; cards/panels `rounded-xl`; avatars `rounded-full`.
7. **Motion** — `animate-fade-in` (~200ms) on page enter; hover transitions 100–200ms; no decorative loops.
8. **Density** — settings lists: compact rows; conversation: denser; reports: metric grid then table.

### 0.5 Shared components (reuse)

| Component | Path / pattern | Notes |
|-----------|----------------|-------|
| `Button` | `components/ui/button` | `primary` = `bg-primary-500 hover:bg-primary-600` |
| `Input` / `Textarea` | `components/ui/*` | `focus:ring-primary-500/30 focus:border-primary-500` |
| `Badge` | `components/ui/badge` | `primary` / `accent` variants |
| `MetricCard` / `MetricGrid` | `components/ui/metric-card` | Reports & campaign stats |
| Settings nav | `components/layout/settings-nav` | Left settings rail |
| Channel config | `components/inboxes/channel-config-panel` | Email / WA / API panels |

### 0.6 Settings vs dashboard placement

| Feature family | Home |
|----------------|------|
| Inbox / channel config, Connected services, Automation, Macros, SLA, Roles, SAML, AI assistants, Help Center admin | **Settings** |
| Reports overview, Channel campaigns list/launch | **Dashboard** sidebar |
| Macros run, AI suggest/summarize | **Conversation** toolbar / side panel |
| Public Help Center | **Public** route (branded portal colors from portal config) |

### 0.7 Accessibility & responsive

- Labels associated with inputs (`htmlFor` / wrap).
- Focus rings use primary cyan, never remove outline without replacement.
- Sidebar collapses / overlays on small screens (match existing dashboard layout).
- Touch targets ≥ 36px for toolbar icons.
- Don’t rely on color alone for channel/status — include icon + text.

### 0.8 Empty / loading / error

| State | Pattern |
|-------|---------|
| Loading | Skeleton pulses `bg-primary-500/20` or gray bars; short “Loading…” copy OK |
| Empty | Centered short sentence + one primary CTA (no illustration collage) |
| Error | `text-sm text-red-600` inline near action; destructive confirms in modal |
| Success toast/banner | Soft `bg-primary-50 border-primary-200 text-primary-900` or green for completed sends |

---

## 1. Sprint 7 — Email channel inbox

**Goal:** Inbound email → conversation; outbound reply via SMTP/Resend.

### Screens

| Screen | Route / surface | Layout |
|--------|-----------------|--------|
| Email inbox create | Settings → Inboxes → Create (`channelType: email`) | Form in white card; channel type chips with primary selected state |
| Email channel config | Inbox detail → Channel panel | 2-col grid (`sm:grid-cols-2`): forwarding address, IMAP host/port/user, SMTP from, Resend toggle, credential select |
| Thread (email) | Conversation | Subject as thread subtitle; quoted reply collapsed (`text-xs text-gray-500`) with “Show quoted” |
| Composer reply | Conversation | Same composer; channel badge **Email** (envelope icon, primary tint chip) |

### Design instructions

1. Config fields use standard `labelClass` + `Input`; secrets write-only (password fields, clear after save).
2. Health row: “Channel health: unknown | healthy | error” with green / amber / red dot.
3. Inbound attachments: file chips under bubble (`rounded-lg border bg-gray-50`).
4. Notification email (agent assignment): HTML email with Mutex wordmark, primary CTA button `#06B6D4`, gray body — not marketing campaign styling.

### DoD UI

- [ ] Admin can save email config without seeing stored secrets again  
- [ ] Conversation list shows email channel badge  
- [ ] Quoted blocks collapsed by default  

---

## 2. Sprint 8 — WhatsApp Cloud API

**Goal:** WABA inbox, inbound/outbound, templates, 24h window.

### Screens

| Screen | Layout |
|--------|--------|
| WA channel config | Phone number ID, WABA ID, display phone, verify token (readonly), access token + **app secret** (write-only password), webhook URL copy field |
| Composer (open window) | Normal text composer |
| Composer (window expired) | Locked state: amber banner “24-hour window expired” + primary CTA “Send template” opening template modal |
| Template picker | Modal: list approved templates, variable inputs, preview bubble (WA green-tinted `#DCF8C6` for preview only — chrome stays Mutex) |
| Delivery ticks | Sent / delivered / read as subtle gray → primary checkmarks under agent bubbles |

### Design instructions

1. WhatsApp **product** green may appear only inside message preview / channel badge; **app chrome stays aqua**.
2. Window lock banner: `border-amber-200 bg-amber-50 text-amber-900`, not red (not an error).
3. Media bubbles: rounded image thumbs max-w-xs; document row with icon + filename.
4. Verify token: readonly input + copy button (secondary).

### DoD UI

- [ ] Expired window blocks free-text send visually and in API  
- [ ] Template modal completes variables before Send  

---

## 3. Sprint 9 — Messenger, Instagram, Telegram, SMS, API channel

**Goal:** Additional channels + health + conversation channel badge.

### Screens

| Channel | Config UI pattern |
|---------|-------------------|
| Facebook / Instagram | “Connect with Meta” primary button → connected page name + Disconnect (secondary/danger) |
| Telegram | Bot token (write-only) + bot username display |
| SMS (Twilio) | Account SID, auth token (write-only), from number |
| API channel | JSON config textarea + **signing secret** shown once on create (`font-mono text-xs`), health status |

### Channel badges (conversation list + thread header)

| Channel | Glyph | Chip |
|---------|-------|------|
| Web | 💬 | gray |
| Email | ✉ | primary-50 / primary-700 |
| WhatsApp | WA | emerald soft |
| Messenger | f | blue soft |
| Instagram | IG | pink soft |
| Telegram | ✈ | sky soft |
| SMS | ⌨ | violet soft |
| API | API | slate |

Chips: `rounded-full text-[10px] font-semibold px-2 py-0.5`.

### Health indicator

Per inbox row: green / amber / red dot + tooltip “Healthy · Token expires · Re-auth required”. Re-auth uses primary button.

---

## 4. Sprint 10 — Automation rules & macros

**Goal:** Rule builder + macros in conversation.

### Screens

| Screen | Route | Layout |
|--------|-------|--------|
| Rules list | Settings → Automation | Header + “New rule”; table/list of name, trigger, enabled toggle, clone |
| Rule builder | Same / drawer or full page | Vertical stack: Trigger → Conditions (AND/OR groups) → Actions; sticky Save |
| Macros list | Settings → Macros | Name, visibility (global/personal), actions summary |
| Run macro | Conversation toolbar ⚡ | Popover list; personal macros only for owner |

### Design instructions

1. Condition rows: indented card groups with “AND” / “OR” pill (`bg-primary-50 text-primary-700`).
2. Action list: numbered steps; each step type select + config fields.
3. Enable toggle: accent teal when on.
4. Toolbar ⚡: ghost icon button; open popover `rounded-xl border shadow-md`, max-h scroll.

### DoD UI

- [ ] Disabled rules appear muted (`opacity-60`)  
- [ ] Macro run refreshes thread messages  

---

## 5. Sprint 11 — Bots & AI copilot suggestions

**Goal:** Bot agents + reply suggestions / summarize / rewrite.

### Screens

| Screen | Layout |
|--------|--------|
| Bot settings | Settings list: avatar, name, webhook URL, inbox multi-select |
| Suggestions panel | Conversation: right or bottom sheet — 3 suggestion cards |
| Summarize | Side panel block with primary “Summarize” → result in `bg-primary-50/50 rounded-xl p-3 text-sm` |
| Rewrite | Selection toolbar: Formal / Friendly / Shorter chips |

### Design instructions

1. AI affordances use ✨ and `accent` / `primary` tints — never purple glow.
2. Suggestion cards: white border, hover `border-primary-200`; “Insert” ghost → primary on hover.
3. Bot messages in thread: distinct avatar + “Bot” caption `text-[10px] text-gray-400`.
4. Handoff banner: “Bot handed off to agent” system line centered gray.

---

## 6. Sprint 12 — AI Assistant (Captain)

**Goal:** Knowledge-backed assistant, documents, tools, copilot side panel.

### Screens

| Screen | Layout |
|--------|--------|
| Assistants list | Settings → AI assistants — cards: name, model, inbox count |
| Assistant config | Tabs: General · Knowledge · Tools · Inboxes |
| Knowledge sources | Table of URL/PDF, status chip (pending/indexing/ready/error) |
| Copilot panel | Conversation right rail ~320px: multi-turn chat, Mutex primary send |

### Design instructions

1. Copilot panel header: `bg-gradient-to-r from-primary-50 to-cyan-50 border-b border-primary-100`.
2. Assistant messages: left-aligned soft primary wash; user (agent) right-aligned gray-100.
3. Tool call chips: mono `text-xs bg-gray-100 rounded-md px-2 py-1`.
4. Document status: ready = green, indexing = amber pulse, error = red.

---

## 7. Sprint 13 — Help Center

**Goal:** Portals, categories, articles, public portal, search.

### Admin (Settings → Help Center)

| Screen | Layout |
|--------|--------|
| Portals | List + create: name, slug, color swatch (portal brand), logo upload |
| Categories | Nested list / tree with drag order handles |
| Article editor | Tiptap full width; status Draft / Published / Archive; publish = admin only |

### Public portal

1. Header uses **portal** `color` + logo (not forced Mutex if tenant customizes; default Mutex aqua).
2. Clean reading layout: max-w-3xl article body, generous line-height.
3. Search bar sticky under header; results list with category crumbs.
4. No dashboard sidebar on public routes.

### Design instructions

- Sanitize HTML; avoid raw script in editor preview.
- Draft badge gray; Published `bg-primary-50 text-primary-700`.

---

## 8. Sprint 14 — Channel campaigns (WA / SMS / widget)

**Goal:** One-off omnichannel campaigns + optional widget drip.

### Screens

| Screen | Route | Layout |
|--------|-------|--------|
| Campaign list | Dashboard → Channel campaigns | Metric strip optional; table name / channel / status / dates |
| Create / edit | Drawer or page | Name, channel, inbox, segment or contact picker, template, schedule |
| Launch | Admin only | Confirm modal: recipient count, channel, “Launch” primary / Cancel secondary |
| Analytics | Campaign detail | `MetricGrid` + progress bar (`bg-primary-500`) |
| Widget drip config | Settings or campaign type | URL rule + delay — compact form |

### Status chips

| Status | Style |
|--------|--------|
| draft | gray-100 / gray-600 |
| scheduled | primary-100 / primary-700 |
| sending | amber |
| completed | green |
| failed | red |

### Design instructions

1. Do **not** show fake “sent” success — if dispatch unimplemented, use failed/amber messaging honestly.
2. Channel column includes S9 badge glyphs.
3. Progress bar track `bg-gray-100`, fill `bg-primary-500`.

---

## 9. Sprint 15 — Reports & analytics

**Goal:** Overview, volume, agent performance, CSAT.

### Screens

| Screen | Layout |
|--------|--------|
| Overview | `/dashboard/reports` — title + “Last 30 days”; `MetricGrid` 2→4 cols |
| Volume chart | Card with filter chips (inbox / team / agent) + line/bar chart |
| Agent table | Sortable table: agent, CSAT, FRT, resolved |
| CSAT dashboard | Score trend + verbatim list |
| Export | Date range + “Export CSV” secondary/primary |

### Metric cards

Reuse `MetricCard`: large `text-[28px] font-bold text-primary-600` (or neutral for times). Format durations as `2m 14s`, empty as `—`.

### Design instructions

1. Filters: horizontal chip row, selected = `bg-primary-500 text-white`.
2. Charts: primary-500 stroke/fill at ~40% opacity; avoid rainbow series.
3. CSV export sits in header actions, not buried.

---

## 10. Sprint 16 — SLA, custom roles, SAML

### SLA

| Screen | Layout |
|--------|--------|
| Policies list | Name, FRT / resolution thresholds, business-hours badge |
| Policy editor | Form sections: thresholds, hours, inbox attach multi-select |
| Conversation SLA | Thread header tiny timers: “FRT 12m left” amber → red when breached |
| Breach alert | In-app bell + optional email |

Timers: `text-xs font-medium`; breach `text-red-600`.

### Roles

Permission matrix: sticky first column (permission name), checkboxes, sections (Inbox / Contacts / Settings / Reports). Save bar sticky bottom.

### SAML

Admin card: IdP metadata URL / XML upload, ACS URL readonly + copy, attribute mapping table. Status “Configured” green chip.

---

## 11. Sprint 17 — Audit, companies, webhooks, apps

### Audit log viewer

- Filters: entity, user, date range.
- Rows expand to JSON/diff (`font-mono text-xs bg-gray-50 rounded-lg p-3`).
- IP / request ID muted caption.

### Companies (tenant CRM)

- List + profile: company header, domain, contacts table, conversation history.
- Distinct from global company registry UI copy (“Workspace companies”).

### Webhooks

- Endpoint URL, event checkboxes, signing secret once, delivery log (success/fail).
- Retry badge amber.

### Dashboard apps

- Side panel iframe; header with app name; postMessage — no extra chrome chrome clutter.

---

## 12. Sprint 20 — Hardening & launch (UI-facing)

**Excluded from visual scope:** infra-only work (indexes, rate limit internals) except where UI surfaces them.

| Story | UI requirement |
|-------|----------------|
| S20-1 CSP / security | No change to look; ensure inline styles aren’t required for brand |
| S20-2 Rate limit | Friendly `429` page/toast: “Too many requests — try again in a moment” |
| S20-4 Search | Global search palette (⌘K): Mutex primary highlight on active row |
| S20-5 API docs | Clean `/docs` typography; primary links |
| S20-6 Onboarding wizard | Full-bleed soft `from-primary-50 to-white`; steps 1–3: Create inbox → Invite agents → Install widget; brand mark large in first step |
| S20-8 Monitoring | No end-user UI |

### Onboarding rules

- First viewport: **FlowChat / Mutex mark**, one headline, one sentence, one CTA — no stats strip.
- Stepper: filled primary circles for done steps.

---

## 13. Cross-sprint conversation chrome

When adding channel / AI / macro / SLA features to the thread:

```
┌ Header: contact · channel badge · SLA timer · assign ┐
├ Messages (scroll)                                      ├ Contact / Copilot rail
├ Toolbar: ⚡ macros · ✨ AI · Attach · Note · Reply     │
└ Composer (or template lock for WA)                     ┘
```

- Toolbar icons: ghost, `hover:bg-primary-50 hover:text-primary-700`.
- Keep composer height stable; panels push rail, don’t cover composer on desktop.

---

## 14. Implementation checklist (design QA)

For each sprint UI PR:

- [ ] Uses `primary-500` / `#06B6D4`, not indigo `#6366F1`
- [ ] Sidebar / settings placement matches §0.6
- [ ] Header + content pattern matches §0.4
- [ ] Empty / error / loading states present
- [ ] Channel badges consistent with §3
- [ ] Secrets never shown after save
- [ ] Mobile web usable (stack forms to 1 col)
- [ ] No purple glow / cream-serif / newspaper layout

---

## 15. Token quick reference (copy-paste)

```css
/* Mutex — live */
--primary-500: #06B6D4;
--primary-600: #0891B2;
--primary-50:  #ECFEFF;
--accent-500:  #2DD4BF;
--sidebar-bg:  #134E4A;
--page-bg:     #F9FAFB;
```

```tsx
// Primary button
className="bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium"

// Page header
className="h-14 bg-white border-b border-gray-200 px-5 flex items-center justify-between shrink-0"

// Card
className="bg-white border border-gray-200 rounded-xl p-5"
```

---

*Document version: 2026-07-26 · Covers S7–S17 & S20 · Excludes S18–S19 mobile · Brand: Mutex aqua from `apps/web` tokens*
