# FlowChat Wireframe Assessment — Sprints 1–6

**Location:** `userstory-wireframes/`  
**Workbook:** `FlowChat_User_Stories_S1_S6.xlsx`  
**Index:** `index.html` (28 screens)  
**Assessed against:** FlowChat app (`apps/web`) + `docs/sprints.md`  
**Date:** 23 June 2026

---

## Executive summary

| Metric | Value |
|--------|-------|
| Wireframe screens | **30** |
| Sprints covered | **6** (S1–S6) + **S7B** stories in workbook |
| User stories (workbook) | **148** (S1–S6 + S6M + S7B) |
| Story points (workbook) | **676** |
| **Wireframe coverage of UI-facing stories** | **✅ Complete** — every developed product module has a wireframe |
| **Blocking wireframe gaps** | **None for shipped S1–S6** · S6M spec has no HTML mocks (by design) |
| **Recommended new wireframes** | **S6M campaign wizard** — see [marketing-module-screens.md](../docs/marketing-module-screens.md) (spec only; HTML mocks not started) |
| **Built routes without wireframes** | **5** (acceptable: OAuth callback, public compliance pages) |

### Verdict

**All S1–S6 developed modules are covered by wireframes.** S1 is infrastructure-only (0 screens by design). S2–S6 map 1:1 to product areas. Gaps are limited to:

1. One **admin settings page** built but not wireframed (`/settings/email-marketing`)
2. **Public/token pages** built without mockups (unsubscribe, confirm subscribe — acceptable)
3. **UI fidelity** — app shell partially aligned; individual pages still use light settings layout vs wireframe dark sidebar + topbar patterns

---

## Sprint scorecard

| Sprint | Theme | Wireframes | User stories | UI stories needing wireframes | Coverage |
|--------|-------|------------|--------------|-------------------------------|----------|
| **S1** | Foundation | 0 | 9 | 3 (auth + shell) | ✅ Via S2 auth screens |
| **S2** | Auth & workspace | 9 | 8 | 6 | ✅ 100% |
| **S3** | Widget & real-time | 2 | 7 | 4 | ✅ 100% |
| **S4** | Conversations & teams | 4 | 19 | 14 | ✅ 100% (composite screens) |
| **S5** | Advanced messaging | 4 | 21 | 12 | ✅ 100% (composite screens) |
| **S6** | CRM & email marketing | 9 | 28 | 18 | ⚠️ 95% — enrichment review UI not wireframed (S6-28) |

---

## Wireframe inventory (28 screens)

### S1 — Foundation (0 screens)

No dedicated screens. Stories S1-1–S1-3, S1-7–S1-9 are backend/CI/deploy. UI stories S1-4, S1-5, S1-6 appear on auth wireframes.

---

### S2 — Auth & workspace (9 screens)

| # | File | Label | Stories | App implementation |
|---|------|-------|---------|-------------------|
| 01 | `01-auth-signup.html` | Sign up | S1-4, S1-5, S1-6 | `/sign-up` |
| 02 | `02-auth-signin.html` | Sign in | S1-4, S1-5 | `/sign-in` |
| 03 | `03-auth-2fa-verify.html` | 2FA verify | S2-8 | `/sign-in` (TOTP step) |
| 04 | `04-auth-2fa-setup.html` | 2FA setup | S2-8 | `/settings/security` |
| 05 | `05-accept-invite.html` | Accept invite | S2-2, S4-17 | `/accept-invite` |
| 09 | `09-settings-account.html` | Account settings | S2-7, S1-3 | `/settings/account` |
| 10 | `10-settings-agents.html` | Agents | S2-2, S4-17 | `/settings/agents` |
| 11 | `11-settings-teams.html` | Teams | S2-3 | `/settings/teams` |
| 12 | `12-settings-inboxes.html` | Inboxes | S2-1, S3-5 | `/settings/inboxes` |

**S2 stories without dedicated wireframe (expected):**

| Story | Reason |
|-------|--------|
| S2-4 | WebSocket service — no UI |
| S2-5 | Availability toggle — sidebar footer (all dashboard screens) |
| S2-6 | Sidebar structure — embedded in screens 06–28 |

---

### S3 — Widget & real-time (2 screens)

| # | File | Label | Stories | App implementation |
|---|------|-------|---------|-------------------|
| 07 | `07-widget.html` | Widget states | S3-2, S3-3, S3-4, S5-14 | `public/widget.js` |
| 13 | `13-settings-inbox-config.html` | Inbox config | S3-5, S4-11–S4-19 | Inbox edit under `/settings/inboxes` |

**S3 stories without dedicated wireframe (expected):**

| Story | Covered by |
|-------|------------|
| S3-1 | DB schema only |
| S3-6 | `06-dashboard-conversations.html` |
| S3-7 | `06-dashboard-conversations.html` + `08-conversation-detail.html` |

---

### S4 — Conversations & teams (4 screens)

| # | File | Label | Stories | App implementation |
|---|------|-------|---------|-------------------|
| 06 | `06-dashboard-conversations.html` | Conversation list | S2-6, S3-6, S3-7, S4-2–S4-4, S4-6, S4-8 | `/dashboard` |
| 08 | `08-conversation-detail.html` | Conversation detail | S4-1–S4-8, S5-1–S5-16, S6-8 | `ConversationThread` + sidebar |
| 14 | `14-settings-labels.html` | Labels | S4-4 | `/settings/labels` |
| 19 | `19-settings-auto-messages.html` | Auto messages | S4-12, S5-11 | `/settings/auto-messages` |

**S4 stories covered inside composite screens (no separate wireframe needed):**

| Story | Wireframe / app location |
|-------|--------------------------|
| S4-5 Snooze | 08 detail + status filters in 06 |
| S4-7 Typing indicator | 08 detail (WS) |
| S4-9 Message alerts | Layout tab badge + sound (`useMessageAlert`) |
| S4-10 Missed-chat alerts | Dashboard layout banner |
| S4-11 Business hours | 13 inbox config |
| S4-12 Offline behaviour | 19 auto messages + 07 widget offline state |
| S4-13 Domain allowlist | 13 inbox config |
| S4-14 API rate limits | Backend only — no screen |
| S4-15 GDPR | 13 inbox config + account settings |
| S4-16 Block visitor | 15 security + contact block |
| S4-17 Tenant access | 05 accept invite + 10 agents + **`/pending-approval`** ⚠️ no wireframe |
| S4-18 Invite domain allowlist | 09 account settings |
| S4-19 Analytics exclusions | 13 inbox config + analytics API |

---

### S5 — Advanced messaging (4 screens)

| # | File | Label | Stories | App implementation |
|---|------|-------|---------|-------------------|
| 15 | `15-settings-security.html` | Security | S2-8, S4-15, S4-16 | `/settings/security` |
| 16 | `16-settings-canned.html` | Canned responses | S5-6 | `/settings/canned-responses` |
| 17 | `17-analytics.html` | Analytics | S5-17, S5-18, S4-19 | `/dashboard/analytics` |
| 18 | `18-settings-integrations.html` | Integrations | S5-20, S5-21, S6-4c | `/settings/integrations` |

**S5 stories covered inside 06, 07, 08, 13:**

| Story | Location |
|-------|----------|
| S5-1 Attachments | 08 conversation detail |
| S5-2 Private notes | 08 |
| S5-3 Edit/delete messages | 08 |
| S5-4 Read receipts | 08 |
| S5-5 Draft persistence | 08 composer (localStorage) |
| S5-7 @mentions | 08 private notes |
| S5-8 Conversation merge | 08 toolbar (if enabled) |
| S5-9 Transcript export | 08 actions menu |
| S5-10 Bulk actions | 06 list multi-select |
| S5-11 Visitor context | 08 right sidebar |
| S5-12 Collision indicator | 08 header |
| S5-13 Custom pre-chat fields | 13 inbox config |
| S5-14 Proactive triggers | 07 widget + 13 config |
| S5-15 Message pagination | 08 (API cursor) |
| S5-16 Email fallback | 13 + widget offline |
| S5-19 Conversation search | 06 topbar search |

---

### S6 — CRM & email marketing (9 screens)

| # | File | Label | Stories | App implementation |
|---|------|-------|---------|-------------------|
| 20 | `20-contacts-list.html` | Contacts list | S6-1, S6-3–S6-6 | `/dashboard/contacts` |
| 21 | `21-contact-profile.html` | Contact profile | S6-2, S6-7–S6-9, S6-20 | `/dashboard/contacts/[id]` |
| 22 | `22-contacts-import.html` | CSV import | S6-4, S6-4b | `ContactImportModal` (modal, not full page) |
| 23 | `23-settings-crm.html` | CRM settings | S6-4b, S6-4c, S6-9 | `/settings/crm` (+ LeadSnapper section) |
| 24 | `24-marketing-segments.html` | Segments | S6-11 | `/dashboard/marketing/segments` |
| 25 | `25-marketing-templates.html` | Email templates | S6-12, S6-13 | `/dashboard/marketing/templates` |
| 26 | `26-marketing-campaigns.html` | Campaigns | S6-14, S6-22, S6-23 | `/dashboard/marketing/campaigns` + `/new` |
| 27 | `27-marketing-campaign-analytics.html` | Campaign analytics | S6-18, S6-19 | `/dashboard/marketing/campaigns/[id]` |
| 28 | `28-marketing-workflows.html` | ~~Workflows~~ **Deprecated** | S6-15, S6-16 *(superseded by S6M)* | `/dashboard/marketing/workflows` — retire at S6M-35 |

**S6 gaps:**

| Story | Built? | Wireframe? | Notes |
|-------|--------|------------|-------|
| S6-10 Subscription model | ✅ `/settings/email-marketing` | ❌ | **Recommend new wireframe** |
| S6-13 Sender identity | ✅ email-marketing + templates | ⚠️ Partial | Split across 25 + settings; footer/domain in settings page |
| S6-17 Unsubscribe | ✅ `/unsubscribe/[token]` | ❌ | Public page — optional wireframe |
| S6-18 Resend webhooks | ✅ API `/api/webhooks/resend` | ❌ | Backend — no screen needed |
| S6-21 Double opt-in | ✅ `/confirm-subscribe/[token]` | ❌ | Public page — optional wireframe |

**S6M (planned) — wireframes not started:**

| Spec | Doc | Wireframe status |
|------|-----|------------------|
| 4-step campaign wizard, composer, stats | `docs/marketing-module-design.md` + `docs/marketing-module-screens.md` | ❌ Spec complete; HTML mocks deferred |
| Screens 26–27 | Pre-S6M broadcast model | ⚠️ Stale vs S6M; replace when mocking S6M |

Legacy screens `26-marketing-campaigns.html`, `27-marketing-campaign-analytics.html`, and `28-marketing-workflows.html` reflect **shipped S6** UI, not the locked S6M redesign. `29-settings-email-marketing.html` aligns with S6M pre-flight (S6M-24).

---

## Built routes not in wireframe index

| Route | Sprint | Wireframe | Priority to add |
|-------|--------|-----------|-----------------|
| `/settings/email-marketing` | S6-10, S6-13 | ❌ Missing | **High** — admin-facing |
| `/pending-approval` | S4-17 | ❌ Missing | Medium — agent onboarding |
| `/dashboard/marketing/campaigns/new` | S6-14 | Partial (wizard in 26) | Low — modal/step in 26 |
| `/auth/callback` | S1-5 | ❌ | None — OAuth redirect |
| `/unsubscribe/[token]` | S6-17 | ❌ | Low — public compliance |
| `/confirm-subscribe/[token]` | S6-21 | ❌ | Low — public compliance |
| `/` (landing) | — | ❌ | Out of S1–S6 scope |

---

## User story → wireframe traceability matrix

Legend: **●** dedicated wireframe · **◐** composite / embedded · **○** backend only · **△** built, no wireframe

### Sprint 1 (9 stories)

| ID | Story (short) | Wireframe | Built |
|----|---------------|-----------|-------|
| S1-1 | Turborepo monorepo | ○ | ✅ |
| S1-2 | Hono API service | ○ | ✅ |
| S1-3 | DB schema accounts/users | ◐ 09 | ✅ |
| S1-4 | Email/password auth | ● 01, 02 | ✅ |
| S1-5 | Google OAuth | ● 01, 02 | ✅ △ callback |
| S1-6 | App shell + protected routes | ● 01, 06+ | ✅ |
| S1-7 | CI pipeline | ○ | ✅ |
| S1-8 | Env config validation | ○ | ✅ |
| S1-9 | Deployment staging | ○ | ✅ |

### Sprint 2 (8 stories)

| ID | Story (short) | Wireframe | Built |
|----|---------------|-----------|-------|
| S2-1 | Inbox/team schema | ◐ 12 | ✅ |
| S2-2 | Agent invite & roles | ● 05, 10 | ✅ |
| S2-3 | Team management | ● 11 | ✅ |
| S2-4 | WebSocket service | ○ | ✅ |
| S2-5 | Agent availability | ◐ sidebar | ✅ |
| S2-6 | Dashboard sidebar | ◐ all dashboard | ✅ (UI aligned) |
| S2-7 | Account settings | ● 09 | ✅ |
| S2-8 | 2FA TOTP | ● 03, 04, 15 | ✅ |

### Sprint 3 (7 stories)

| ID | Story (short) | Wireframe | Built |
|----|---------------|-----------|-------|
| S3-1 | Conversation/message schema | ○ | ✅ |
| S3-2 | Web widget bundle | ● 07 | ✅ |
| S3-3 | Widget → API first message | ● 07 | ✅ |
| S3-4 | Widget ↔ WS real-time | ● 07 | ✅ |
| S3-5 | Inbox settings + embed | ● 12, 13 | ✅ |
| S3-6 | Conversation list panel | ● 06 | ✅ |
| S3-7 | Basic conversation view | ● 06, 08 | ✅ |

### Sprint 4 (19 stories)

| ID | Story (short) | Wireframe | Built |
|----|---------------|-----------|-------|
| S4-1 | Assignment / round-robin | ◐ 08 | ✅ |
| S4-2 | Status open/pending/resolved/snoozed | ● 06 | ✅ |
| S4-3 | Priority tiers | ● 06 | ✅ |
| S4-4 | Labels | ● 06, 14 | ✅ |
| S4-5 | Snooze | ◐ 08 | ✅ |
| S4-6 | Conversation filters | ● 06 | ✅ |
| S4-7 | Typing indicator | ◐ 08 | ✅ |
| S4-8 | Mine / unassigned queues | ● 06 | ✅ |
| S4-9 | Message alerts | ◐ layout | ✅ |
| S4-10 | Missed-chat alerts | ◐ layout | ✅ |
| S4-11 | Business hours | ● 13 | ✅ |
| S4-12 | Offline behaviour | ● 19, 07 | ✅ |
| S4-13 | Domain allowlist | ● 13 | ✅ |
| S4-14 | Public API rate limits | ○ | ✅ |
| S4-15 | GDPR baseline | ◐ 13, 09, 15 | ✅ |
| S4-16 | Block visitor | ● 15 | ✅ |
| S4-17 | Tenant access / approve | ● 05, 10 | ✅ △ pending-approval |
| S4-18 | Invite domain allowlist | ◐ 09 | ✅ |
| S4-19 | Analytics exclusions | ◐ 13, 17 | ✅ |

### Sprint 5 (21 stories)

| ID | Story (short) | Wireframe | Built |
|----|---------------|-----------|-------|
| S5-1 | File attachments | ◐ 08 | ✅ |
| S5-2 | Private notes | ◐ 08 | ✅ |
| S5-3 | Message edit/delete | ◐ 08 | ✅ |
| S5-4 | Read receipts | ◐ 08 | ✅ |
| S5-5 | Draft persistence | ◐ 08 | ✅ |
| S5-6 | Canned responses | ● 16 | ✅ |
| S5-7 | @mentions in notes | ◐ 08 | ✅ |
| S5-8 | Conversation merge | ◐ 08 | ✅ |
| S5-9 | Transcript export | ◐ 08 | ✅ |
| S5-10 | Bulk actions | ◐ 06 | ✅ |
| S5-11 | Visitor context sidebar | ◐ 08, 19 | ✅ |
| S5-12 | Collision indicator | ◐ 08 | ✅ |
| S5-13 | Custom pre-chat fields | ● 13 | ✅ |
| S5-14 | Proactive chat triggers | ● 07 | ✅ |
| S5-15 | Message reliability | ◐ 08 | ✅ |
| S5-16 | Email fallback | ◐ 13 | ✅ |
| S5-17 | Post-chat CSAT | ◐ 07, 08 | ✅ |
| S5-18 | Support KPIs | ● 17 | ✅ |
| S5-19 | Conversation search | ◐ 06 | ✅ |
| S5-20 | Webhooks | ● 18 | ✅ |
| S5-21 | Audit log | ● 18 | ✅ |

### Sprint 6 (23 stories)

| ID | Story (short) | Wireframe | Built |
|----|---------------|-----------|-------|
| S6-1 | Contacts list | ● 20 | ✅ |
| S6-2 | Contact profile | ● 21 | ✅ |
| S6-3 | Contact CRUD | ● 20, 21 | ✅ |
| S6-4 | CSV import job | ● 22 (modal) | ✅ |
| S6-4b | Import/export governance | ● 23 | ✅ |
| S6-4c | CRM integrations API | ● 18, 23 | ✅ + LeadSnapper |
| S6-5 | Contact export | ● 20 | ✅ |
| S6-6 | Contact merge | ● 20 | ✅ |
| S6-7 | Contact notes | ● 21 | ✅ |
| S6-8 | Conversation participants | ◐ 08, 21 | ✅ |
| S6-9 | Custom attributes | ● 21, 23 | ✅ |
| S6-10 | Subscription model | △ | ✅ △ no wireframe |
| S6-11 | Segments | ● 24 | ✅ |
| S6-12 | Email templates | ● 25 | ✅ |
| S6-13 | Sender identity | ◐ 25 | ✅ △ settings page |
| S6-14 | Broadcast campaigns | ● 26 | ✅ |
| S6-15 | Automation workflows | ● 28 | ✅ |
| S6-16 | Drip sequences | ● 28 | ✅ |
| S6-17 | Unsubscribe | ◐ 28 | ✅ △ public page |
| S6-18 | Resend webhooks | ○ | ✅ |
| S6-19 | Campaign analytics | ● 27 | ✅ |
| S6-20 | Contact email timeline | ● 21 | ✅ |
| S6-21 | Double opt-in | ◐ 28 | ✅ △ confirm page |
| S6-22 | A/B subject test | ● 26 | ✅ |
| S6-23 | Send-time optimization | ● 26 | ✅ |

---

## Coverage statistics

| Category | Count |
|----------|-------|
| Total S1–S6 stories | 87 |
| Backend-only (no wireframe needed) | 8 |
| UI stories with wireframe coverage (● or ◐) | 76 |
| UI stories built without wireframe (△) | 3 (S6-10 settings, S4-17 pending, partial S6-13) |
| Public pages built without wireframe | 2 (unsubscribe, confirm-subscribe) |
| **Wireframe coverage of UI-facing work** | **96%** (76/79) |
| **Module coverage (product areas)** | **100%** |

---

## Design system reference (wireframes)

| Token | Value | App status |
|-------|-------|------------|
| Sidebar background | `#1E1B4B` | ✅ `globals.css` + dashboard layout |
| Sidebar hover | `#312E81` | ✅ |
| Sidebar text | `#C7D2FE` | ✅ |
| Section labels | `#6366F1` | ✅ |
| Primary | `#6366F1` | ✅ existing |
| Page background | `#F9FAFB` | ✅ |
| Card border | `#E5E7EB` | ✅ |

### Navigation structure (wireframe vs app)

| Wireframe section | App route | Status |
|-------------------|-----------|--------|
| All conversations | `/dashboard` | ✅ |
| Mine | `/dashboard?filter=mine` | ✅ |
| Unassigned | `/dashboard?filter=unassigned` | ✅ |
| Inboxes (per inbox) | `/dashboard?inbox={id}` | ✅ |
| Teams (per team) | `/dashboard?team={id}` | ✅ |
| Contacts | `/dashboard/contacts` | ✅ |
| Marketing | `/dashboard/marketing/campaigns` | ✅ |
| Analytics | `/dashboard/analytics` | ✅ |
| Settings | `/settings/account` | ✅ |
| Unread badges on nav items | — | ❌ Not yet |

---

## UI fidelity checklist (wireframe → app)

| Screen | Functional parity | Visual parity | Notes |
|--------|-------------------|---------------|-------|
| 01–05 Auth | ✅ | ⚠️ Partial | App uses simpler layout vs split-panel wireframes |
| 06 Conversations | ✅ | ⚠️ Partial | Filters work; list styling differs |
| 07 Widget | ✅ | ⚠️ Partial | States implemented; preview page differs |
| 08 Conversation detail | ✅ | ⚠️ Partial | Feature-complete; sidebar density differs |
| 09–19 Settings | ✅ | ⚠️ Partial | Light settings sub-nav vs wireframe topbar |
| 17 Analytics | ✅ | ⚠️ Partial | KPIs present; charts simplified |
| 20 Contacts list | ✅ | ⚠️ Partial | Duplicate banner added; subscription column missing |
| 21 Contact profile | ✅ | ⚠️ Partial | LeadSnapper attrs in CRM settings + profile |
| 22 Import wizard | ✅ | ⚠️ Modal | 3-step flow in modal not full page |
| 23 CRM settings | ✅ | ⚠️ Partial | LeadSnapper section added post-wireframe |
| 24–28 Marketing | ✅ | ⚠️ Partial | Core flows work; visual polish pending |

---

## Recommendations

### 1. Wireframes to add (optional, not blocking)

| Priority | Screen | Stories | Rationale |
|----------|--------|---------|-----------|
| **P1** | `29-settings-email-marketing.html` | S6-10, S6-13 | Only major admin page without a mockup |
| **P2** | `30-pending-approval.html` | S4-17 | Agent onboarding state distinct from accept-invite |
| P3 | `31-unsubscribe.html` | S6-17 | Public compliance page |
| P4 | `32-confirm-subscribe.html` | S6-21 | Double opt-in confirmation |

### 2. UI implementation order (post-assessment)

1. ✅ Dashboard shell — dark sidebar, queue links *(done)*
2. Auth pages 01–05 — split-panel + brand panel
3. Settings wrapper — horizontal nav matching 09–19 topbar pattern
4. Conversations 06/08 — list density, unread badges, visitor sidebar
5. Contacts 20/21 — subscription column, metric header
6. Marketing 24–28 — cards, wizard steps, workflow canvas

### 3. No wireframe required

- OAuth callback, webhook ingest endpoints, cron jobs, WS service
- LeadSnapper Chrome extension UI (separate repo)

---

## Conclusion

**The wireframe set covers all developed S1–S6 product modules** as originally shipped. Thirty screens map to UI-facing user stories via dedicated or composite layouts.

**S6M Marketing Campaign Redesign** is fully specified in `docs/marketing-module-screens.md` but **has no HTML wireframes yet** (intentionally deferred). Screens 26–28 are **stale** relative to S6M; screen 28 (workflows) is **deprecated**.

Minor gaps: enrichment review UI on contact profile (S6-28), public unsubscribe/confirm pages.

**For S6M implementation:** use [marketing-module-design.md](../docs/marketing-module-design.md) (visual) and [marketing-module-screens.md](../docs/marketing-module-screens.md) (behaviour) — not the legacy marketing wireframes.

---

*Generated for Mutex Systems / FlowChat · See also `docs/sprints.md`, `docs/MUTEX_SYSTEMS_SETUP.md`, `docs/marketing-module-screens.md`*
