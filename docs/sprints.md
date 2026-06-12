# FlowChat — Sprint Plan

> 2-week sprints · Agile / Scrum · Target velocity: 40 story points per sprint  
> Start date: 2026-06-15 · Stack: Next.js 15 + Hono/Bun + PostgreSQL + Drizzle

---

## Roadmap Overview

| Phase | Sprints | Theme | Deliverable |
|---|---|---|---|
| 1 — Foundation | 1 – 3 | Monorepo, auth, first inbox | Agents can receive web chats |
| 2 — Industry-Standard Chat | 4 – 5 | Lifecycle, messaging, trust, ops KPIs | **Chat module complete** (gate before CRM) |
| 2b — CRM + Email Marketing | 6 | Contacts, segments, email automation | CRM + industry-standard outbound email |
| 3 — Multi-channel | 7 – 9 | Email, WhatsApp, social channels | Omnichannel inbox |
| 4 — Automation & AI | 10 – 12 | Rules, macros, AI copilot | Intelligent routing + suggestions |
| 5 — Knowledge & Campaigns | 13 – 14 | Help center, campaigns | Self-service + outbound |
| 6 — Enterprise | 15 – 17 | Reports, SLA, roles, audit | Production-ready platform |
| 7 — Mobile | 18 – 19 | Expo app, push notifications | iOS + Android apps |
| 8 — Hardening | 20 | Performance, security, docs | Public launch |

---

## Phase 1 — Foundation

---

### Sprint 1 · 2026-06-15 → 2026-06-28
**Goal:** Monorepo up, authentication working, database schema in place, empty dashboard shell renders.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S1-1 | Set up Turborepo monorepo with `apps/web`, `services/api`, `services/ws`, `packages/db`, `packages/types` | 5 | Must |
| S1-2 | Bun + Hono API service — health check route, OpenAPI spec wiring, Zod middleware | 3 | Must |
| S1-3 | Drizzle schema: `accounts`, `users`, `account_users` tables + migrations | 5 | Must |
| S1-4 | Auth — email/password sign-up + sign-in (Lucia + argon2), JWT session tokens | 8 | Must |
| S1-5 | Auth — Google OAuth 2.0 (Arctic) | 3 | Should |
| S1-6 | Next.js app shell — layout, sidebar skeleton, protected routes via middleware | 5 | Must |
| S1-7 | CI pipeline — GitHub Actions: typecheck, lint (Biome), unit tests (Vitest) | 3 | Must |
| S1-8 | Environment config — `.env` schema validation with Zod, per-service config objects | 2 | Must |
| S1-9 | Deployment: Next.js → Vercel, API → Railway, DB → Neon (staging environment) | 3 | Must |

**Sprint total: 37 pts**

#### Definition of Done
- [ ] `pnpm dev` starts all services locally
- [ ] Sign-up, sign-in, sign-out flow works end-to-end
- [ ] Staging URL live and accessible
- [ ] CI passes on every PR

---

### Sprint 2 · 2026-06-29 → 2026-07-12
**Goal:** Multi-account support, agent roles, inbox management UI, real-time WebSocket layer live.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S2-1 | Drizzle schema: `inboxes`, `inbox_members`, `teams`, `team_members` | 5 | Must |
| S2-2 | Agent management — invite by email, role assignment (admin/agent), deactivate | 5 | Must |
| S2-3 | Team management — create team, assign agents, team settings page | 3 | Must |
| S2-4 | Bun WebSocket service — room management keyed by `account:conversation`, Redis pub/sub backbone | 8 | Must |
| S2-5 | Agent availability — online/busy/offline toggle, auto-offline on inactivity (Redis TTL) | 3 | Must |
| S2-6 | Dashboard sidebar — inbox list, team list, unread badges, agent avatar + status dot | 5 | Should |
| S2-7 | Account settings page — name, timezone, locale, logo upload (R2) | 3 | Should |
| S2-8 | Two-factor authentication — TOTP setup, backup codes (oslo) | 5 | Should |

**Sprint total: 37 pts**

#### Definition of Done
- [ ] Admin can invite agents, set roles, create teams
- [ ] WebSocket connection established on login, presence shows in UI
- [ ] 2FA enrol and verify flow working

---

### Sprint 3 · 2026-07-13 → 2026-07-26
**Goal:** Web Live Chat widget ships — visitors can start a chat, agents receive it in real time.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S3-1 | Drizzle schema: `conversations`, `messages`, `contacts`, `contact_inboxes` | 8 | Must |
| S3-2 | Web widget — Vite IIFE bundle, chat bubble, pre-chat form, open/close animation | 8 | Must |
| S3-3 | Widget → API: create contact + conversation on first message | 5 | Must |
| S3-4 | Widget ↔ WS: real-time message delivery both directions | 5 | Must |
| S3-5 | Inbox settings — create Web widget inbox, embed code generator, greeting message | 3 | Must |
| S3-6 | Conversation list panel — shows open conversations, unread count, last message preview | 5 | Must |
| S3-7 | Basic conversation view — message thread, reply composer, send message | 5 | Must |

**Sprint total: 39 pts**

#### Definition of Done
- [ ] Widget loads on a test HTML page, visitor sends a message
- [ ] Agent sees new conversation in dashboard within 1 s
- [ ] Agent replies, visitor receives it in widget in real time

---

## Phase 2 — Industry-Standard Chat Module

> **Gate:** Sprint 6 (CRM) does **not** start until the [Chat Module Definition of Done](chat-module-standard.md) is satisfied.  
> Sprints 4–5 together deliver a web live-chat product comparable to mid-tier tools (Crisp, LiveChat, Zendesk Chat).  
> Expanded scope (~65–70 pts each) may run as **3-week sprints** or split into 4A/4B if velocity is 40 pts.

See also: [chat-module-standard.md](chat-module-standard.md) — full checklist and acceptance criteria.

---

### Sprint 4 · 2026-07-27 → 2026-08-16 *(extended)*
**Goal:** Conversation lifecycle + platform trust (security, compliance, notifications, tenant access).

#### Lifecycle & routing

| # | Story | Points | Priority |
|---|---|---|---|
| S4-1 | Conversation assignment — assign/reassign agent, assign to team, round-robin auto-assignment | 8 | Must |
| S4-2 | Conversation status — open / pending / resolved / snoozed, badges, list views per status | 5 | Must |
| S4-3 | Priority tiers — urgent / high / medium / low, colour-coded, filter by priority | 3 | Must |
| S4-4 | Labels/tags — create labels, multi-label on conversation, filter by label | 5 | Must |
| S4-5 | Snooze — wake-up time picker, auto-reopen job (BullMQ), snoozed inbox view | 5 | Must |
| S4-6 | Conversation filters — status, assignee, team, inbox, label, priority, date range | 5 | Must |
| S4-7 | Typing indicator — agent and visitor typing in real time via WebSocket | 2 | Must |
| S4-8 | “Mine” / assignee views — dashboard filters for assigned-to-me and unassigned queues | 3 | Must |

#### Notifications & availability

| # | Story | Points | Priority |
|---|---|---|---|
| S4-9 | Agent message alerts — tab badge, sound on new visitor message, mute toggle | 5 | Must |
| S4-10 | Missed-chat alerts — email/in-app when no agent reply within configurable threshold | 5 | Must |
| S4-11 | Business hours — per-inbox schedule + timezone, widget online/away/offline state | 8 | Must |
| S4-12 | Offline behaviour — offline auto-reply, queue message or email-capture when agents unavailable | 5 | Must |

#### Security, compliance & multi-tenant

| # | Story | Points | Priority |
|---|---|---|---|
| S4-13 | Widget domain allowlist — approved domains per inbox; block unauthorized embed origins | 5 | Must |
| S4-14 | Public API hardening — rate limits on visit/session/message (per IP + sourceId); optional Turnstile | 5 | Must |
| S4-15 | GDPR baseline — pre-chat consent + privacy link, data retention setting, export/delete visitor data | 8 | Must |
| S4-16 | Block visitor — block by IP or contact; blocked visitors cannot start/send messages | 3 | Must |
| S4-17 | Tenant access completion — inbox picker on agent approve; invite email via Resend (not copy-paste only) | 5 | Must |
| S4-18 | Optional workspace email domain allowlist — restrict agent invites to `@company.com` patterns | 3 | Should |
| S4-19 | Analytics exclusions — per-inbox IP and machine (browser source ID) exceptions; excluded traffic omitted from stats | 3 | Must |

**Sprint 4 total: ~73 pts (Must: ~68)**

#### Definition of Done (Sprint 4)
- [x] Agent can assign, snooze, label, and filter conversations
- [x] Widget respects business hours and shows honest availability
- [x] Widget only loads on allowlisted domains; public APIs are rate-limited
- [x] New messages alert agents; missed chats escalate
- [x] Admin can approve agents and assign specific websites/inboxes
- [x] Admin can exclude office IPs and test machines from analytics metrics

---

### Sprint 5 · 2026-08-17 → 2026-09-06 *(extended)*
**Goal:** Rich messaging + agent/visitor experience standards + integrations KPIs (completes chat module).

#### Rich messaging

| # | Story | Points | Priority |
|---|---|---|---|
| S5-1 | File attachments — upload to R2, pre-signed URLs, image preview in thread (max 15) | 8 | Must |
| S5-2 | Private notes — internal messages, visually distinct, never sent to visitor | 3 | Must |
| S5-3 | Message edit & delete — edit within 15 min, soft-delete with audit entry | 3 | Must |
| S5-4 | Read receipts — delivered/read icons, real-time via WS | 3 | Must |
| S5-5 | Draft persistence — draft per conversation (API + localStorage fallback) | 3 | Should |
| S5-6 | Canned responses — create/search/insert, `/<keyword>` shortcut in composer | 5 | Must |
| S5-7 | Mention agents — `@agent` in private notes triggers notification | 5 | Must |
| S5-8 | Conversation merge — merge two threads, activity log entry | 5 | Should |
| S5-9 | Transcript export — plain-text export + email transcript to address | 3 | Should |
| S5-10 | Bulk actions — multi-select assign / resolve / label | 5 | Should |

#### Agent & visitor experience (industry standard)

| # | Story | Points | Priority |
|---|---|---|---|
| S5-11 | Visitor context sidebar — page URL, referrer, geo (coarse), device, visit count, past chats | 5 | Must |
| S5-12 | Agent collision indicator — “Agent X is viewing this conversation” via WS presence | 3 | Must |
| S5-13 | Custom pre-chat fields — configurable fields per inbox (text, select, required flags) | 5 | Must |
| S5-14 | Proactive chat triggers — time-on-page / URL rules, dismiss + frequency cap | 5 | Should |
| S5-15 | Message reliability — cursor pagination for long threads; idempotent send (no duplicates on retry) | 5 | Must |
| S5-16 | Email fallback — unanswered/offline chat routes to agent email or capture form | 5 | Should |

#### Quality, search & integrations

| # | Story | Points | Priority |
|---|---|---|---|
| S5-17 | Post-chat CSAT — star rating after resolve, optional comment, per-inbox toggle | 5 | Must |
| S5-18 | Support KPIs — FRT, resolution time, missed/unanswered rate in analytics dashboard | 5 | Must |
| S5-19 | Conversation search — search contact name, email, message body, conversation ID | 5 | Must |
| S5-20 | Webhooks — `conversation.created`, `message.created`, `conversation.resolved` + HMAC signing | 8 | Must |
| S5-21 | Agent action audit log — assign, resolve, approve agent, settings changes (who/when/what) | 5 | Must |

**Sprint 5 total: ~87 pts (Must: ~68)**

#### Definition of Done (Sprint 5 — **Chat Module Complete**)
- [x] All items in [chat-module-standard.md](chat-module-standard.md) marked **Must** are shipped
- [x] Attachments, notes, canned replies, and CSAT work end-to-end
- [x] FRT and resolution metrics visible per inbox/agent
- [x] Webhooks deliver signed events to customer endpoints
- [x] Conversation search returns results in &lt; 500 ms for typical accounts
- [ ] **No CRM sprint work begins until this checklist is signed off** *(pending your sign-off after migration + deploy)*

---

### Sprint 6 · 2026-09-07 → 2026-10-04 *(extended — 4 weeks)*
**Prerequisite:** [Chat Module Definition of Done](chat-module-standard.md) ✅  
**Goal:** CRM contact management **plus** industry-standard email marketing automation (segments, broadcasts, drip workflows).

> Email **inbox** (inbound reply-by-email) remains Sprint 7. Sprint 6 delivers **outbound marketing automation** on CRM contacts (HubSpot / Mailchimp / Brevo parity for SMB).  
> See [email-marketing-standard.md](email-marketing-standard.md) for the full checklist.

#### CRM — contacts & profile

| # | Story | Points | Priority |
|---|---|---|---|
| S6-1 | Contacts list — search by name/email/phone, filter by type, sort | 5 | Must |
| S6-2 | Contact profile page — all fields, conversation history, notes, labels | 5 | Must |
| S6-3 | Contact create / edit / delete — full CRUD with validation | 3 | Must |
| S6-4 | Contact import — CSV upload, field mapping, background job (BullMQ), error report | 8 | Must |
| S6-4b | Import/export governance — Settings toggles enable CSV import/export; per-agent allowlist (admins always when enabled) | 3 | Must |
| S6-4c | CRM integrations API — API keys for inbound contact sync; webhooks for outbound `contact.created/updated/deleted`; `externalId` upsert | 5 | Must |
| S6-5 | Contact export — CSV download with filters applied | 3 | Should |
| S6-6 | Contact merge — identify duplicates, confirm merge, redirect conversations | 5 | Should |
| S6-7 | Contact notes — add/edit/delete timestamped notes on contact | 3 | Must |
| S6-8 | Conversation participants — add agents as observers, participant notification settings | 3 | Should |
| S6-9 | Custom attributes — define schema per account (contact + conversation), render in sidebar | 5 | Should |

#### Email marketing — foundation (lists, consent, templates)

| # | Story | Points | Priority |
|---|---|---|---|
| S6-10 | Subscription model — per-contact status (subscribed / unsubscribed / bounced / complained); global suppression list | 5 | Must |
| S6-11 | Segments — static lists + dynamic segments (labels, attributes, last activity, subscription status) | 8 | Must |
| S6-12 | Email templates — HTML + plain-text editor, merge tags (`{{first_name}}`, custom attrs), preview, test send | 8 | Must |
| S6-13 | Sender identity — workspace from-name, reply-to, verified sending domain status (Resend); physical address footer | 3 | Must |

#### Email marketing — campaigns & automation

| # | Story | Points | Priority |
|---|---|---|---|
| S6-14 | Broadcast campaigns — select segment + template, schedule or send now, BullMQ dispatch with rate limits | 8 | Must |
| S6-15 | Automation workflows — visual step builder: triggers (contact created, label added, conversation resolved, manual enroll) → actions (send email, wait, branch on opened/clicked, add label, exit) | 13 | Must |
| S6-16 | Drip sequences — multi-step time-delayed series inside a workflow; enrollment caps and re-entry rules | 5 | Must |
| S6-17 | Unsubscribe — one-click public page, `List-Unsubscribe` header, instant suppression; preference center (opt-down vs opt-out) | 5 | Must |

#### Email marketing — delivery, tracking & analytics

| # | Story | Points | Priority |
|---|---|---|---|
| S6-18 | Resend webhooks — ingest delivered, bounced, opened, clicked, complained; update contact + campaign recipient status | 5 | Must |
| S6-19 | Campaign analytics — sent / delivered / open % / click % / bounce % / unsubscribe %; live send progress | 5 | Must |
| S6-20 | Contact email timeline — all marketing sends, opens, clicks on contact profile | 3 | Must |
| S6-21 | Double opt-in — optional confirm-email flow before first marketing send | 3 | Should |
| S6-22 | A/B subject test — two variants, winner by open rate after N hours | 5 | Should |
| S6-23 | Send-time optimization — schedule in recipient timezone window (basic) | 3 | Should |

**Sprint 6 total: ~108 pts (Must: ~88 · CRM ~24 + Email ~64)**

#### Definition of Done (Sprint 6)
- [ ] Admin can enable/disable CSV import and export in Settings → CRM and assign which agents may use each
- [ ] Admin can create API keys and webhooks in Settings → Integrations for two-way contact sync with external CRMs
- [ ] Admin can import contacts and build static + dynamic segments
- [ ] Admin can create HTML templates with merge tags and send a test email
- [ ] Admin can run a broadcast campaign to a segment; recipients receive mail from verified domain
- [ ] Admin can publish an automation workflow (welcome drip, post-chat follow-up) that runs on triggers
- [ ] Unsubscribe link works; suppressed contacts never receive marketing mail
- [ ] Campaign dashboard shows delivery and engagement metrics; contact profile shows email history
- [ ] All **Must** items in [email-marketing-standard.md](email-marketing-standard.md) verified in staging

---

## Phase 3 — Multi-channel

> Phase 3+ sprint dates follow Phase 2 extension (+2 weeks from original plan).

---

### Sprint 7 · 2026-09-21 → 2026-10-04
**Goal:** Email channel — inbound email → conversation, outbound reply via SMTP.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S7-1 | Email inbox setup — IMAP polling config, forwarding address, SMTP send config | 8 | Must |
| S7-2 | Inbound email → conversation — parse mime, extract body + attachments, deduplicate by Message-ID | 8 | Must |
| S7-3 | Thread continuity — In-Reply-To header tracking, append to existing conversation | 5 | Must |
| S7-4 | Outbound reply — compose reply, send via SMTP/Resend, record sent message | 5 | Must |
| S7-5 | Email template — HTML reply template with branding, unsubscribe footer | 3 | Should |
| S7-6 | Quoted reply — collapse quoted text in thread view, expand on click | 3 | Should |
| S7-7 | Email notifications — agent receives email for new assignment (React Email + Resend) | 3 | Must |

**Sprint total: 35 pts**

---

### Sprint 8 · 2026-10-05 → 2026-10-18
**Goal:** WhatsApp Cloud API channel — receive and send messages, templates.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S8-1 | WhatsApp Cloud API inbox — webhook verification, WABA token storage | 5 | Must |
| S8-2 | Inbound messages — text, image, audio, video, document, sticker, location | 8 | Must |
| S8-3 | Outbound messages — text, media, reply to specific message | 5 | Must |
| S8-4 | Message status — sent / delivered / read webhooks update message status | 3 | Must |
| S8-5 | Message templates — sync approved templates, select + fill variables in composer | 8 | Must |
| S8-6 | 24-hour reply window enforcement — lock composer after window, show template selector | 3 | Must |
| S8-7 | WhatsApp Twilio fallback — Twilio-based WA inbox as alternate provider | 5 | Should |

**Sprint total: 37 pts**

---

### Sprint 9 · 2026-10-05 → 2026-10-18
**Goal:** Facebook Messenger, Instagram DM, Telegram, SMS channels.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S9-1 | Facebook Messenger — OAuth page authorization, receive/send messages via Graph API | 8 | Must |
| S9-2 | Instagram DM — same OAuth flow, DM receive/send | 5 | Must |
| S9-3 | Telegram — bot token setup, receive/send text + media via Bot API | 5 | Must |
| S9-4 | SMS (Twilio) — inbox config, inbound webhook, outbound via Twilio API | 5 | Must |
| S9-5 | API Channel — generic webhook inbox, custom send endpoint, secret signing | 5 | Should |
| S9-6 | Channel health check — per-inbox status indicator, re-auth prompt when token expires | 3 | Should |
| S9-7 | Channel badge in conversation — icon shows which channel the conversation came from | 2 | Must |

**Sprint total: 33 pts**

---

## Phase 4 — Automation & AI

---

### Sprint 10 · 2026-10-19 → 2026-11-01
**Goal:** Automation rules engine — event triggers, conditions, actions.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S10-1 | Drizzle schema: `automation_rules`, `automation_conditions`, `automation_actions` | 5 | Must |
| S10-2 | Rule builder UI — trigger select, condition builder (AND/OR groups), action list | 8 | Must |
| S10-3 | Rule execution engine — BullMQ job processes events, evaluates conditions, runs actions | 8 | Must |
| S10-4 | Actions: send message, add/remove label, assign agent/team, change status, set priority | 5 | Must |
| S10-5 | Actions: mute, fire webhook, add private note, send email transcript | 3 | Should |
| S10-6 | Rule enable/disable toggle, rule ordering, clone rule | 3 | Should |
| S10-7 | Macros — saved action sequences (personal + global), run from conversation toolbar | 5 | Must |

**Sprint total: 37 pts**

---

### Sprint 11 · 2026-11-02 → 2026-11-15
**Goal:** Agent bots + AI copilot reply suggestions.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S11-1 | Agent bot model — webhook bot type, token, avatar, inbox assignment | 5 | Must |
| S11-2 | Bot message flow — receive conversation, send bot messages, handoff to human | 5 | Must |
| S11-3 | AI service scaffold — Vercel AI SDK, provider config (OpenAI / Anthropic), streaming | 5 | Must |
| S11-4 | Reply suggestions — AI suggests 3 replies based on conversation context, one-click insert | 8 | Must |
| S11-5 | Message summarise — summarise long thread in sidebar panel | 5 | Should |
| S11-6 | Message rewrite — rephrase selected text (tone: formal / friendly / shorter) | 3 | Should |
| S11-7 | Label suggestions — AI proposes labels after conversation resolves | 3 | Should |
| S11-8 | Follow-up generator — suggest next-step message after resolution | 3 | Should |

**Sprint total: 37 pts**

---

### Sprint 12 · 2026-11-16 → 2026-11-29
**Goal:** AI Assistant (Captain) — full knowledge-base-backed assistant with tools.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S12-1 | Drizzle schema: `ai_assistants`, `ai_documents`, `ai_tools`, `ai_copilot_threads` | 5 | Must |
| S12-2 | pgvector setup — embedding generation job (OpenAI text-embedding-3-small), cosine search | 8 | Must |
| S12-3 | Document ingestion — URL sync + PDF upload, chunking, embed, status tracking | 8 | Must |
| S12-4 | Assistant config UI — model, temperature, guidelines, knowledge sources, inbox assignment | 5 | Must |
| S12-5 | Built-in tools — FAQ lookup, handoff, add label, set priority, add note, resolve | 5 | Must |
| S12-6 | Custom AI tools — HTTP endpoint builder, param schema, auth config (max 15) | 5 | Should |
| S12-7 | Copilot panel — side panel AI thread per conversation, multi-turn chat with full context | 5 | Must |

**Sprint total: 41 pts**

---

## Phase 5 — Knowledge Base & Campaigns

---

### Sprint 13 · 2026-11-30 → 2026-12-13
**Goal:** Help Center — portals, categories, articles, full-text search.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S13-1 | Drizzle schema: `portals`, `portal_categories`, `articles` | 5 | Must |
| S13-2 | Portal creation — slug, custom domain, color, logo, header text | 5 | Must |
| S13-3 | Article editor — Tiptap rich text, draft/publish/archive, locale, meta fields | 8 | Must |
| S13-4 | Category management — create, nest, order articles | 3 | Must |
| S13-5 | Public portal — server-rendered Next.js route group, article listing + detail pages | 8 | Must |
| S13-6 | Full-text search — Typesense index for articles, search bar on portal + agent panel | 5 | Must |
| S13-7 | Insert article in reply — agent searches articles from composer, inserts link/content | 3 | Should |

**Sprint total: 37 pts**

---

### Sprint 14 · 2026-12-14 → 2026-12-27
**Goal:** Omnichannel campaigns — one-off WhatsApp/SMS campaigns + drip web widget campaigns.  
> **Note:** Email marketing automation (broadcasts, drips, segments) ships in **Sprint 6**. Sprint 14 extends the campaign engine to WA/SMS/widget channels only.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S14-1 | Drizzle schema: `campaigns`, `campaign_contacts` | 3 | Must |
| S14-2 | One-off campaign — select inbox (WA/SMS), contact segment, template, schedule or send now | 8 | Must |
| S14-3 | Campaign dispatch job — BullMQ, per-recipient status tracking, rate limiting | 8 | Must |
| S14-4 | Campaign analytics — sent/delivered/failed/replied counts, live progress bar | 5 | Should |
| S14-5 | Drip campaign — web widget, trigger on URL + time-on-page, message delay config | 5 | Should |
| S14-6 | Campaign list — enable/disable, duplicate, archive | 3 | Should |

**Sprint total: 32 pts**

---

## Phase 6 — Enterprise

---

### Sprint 15 · 2027-01-05 → 2027-01-18
**Goal:** Reports & Analytics dashboard — conversation volume, agent performance, CSAT.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S15-1 | Reporting events model — track FRT, resolution time, message count per conversation | 8 | Must |
| S15-2 | Overview dashboard — open/resolved/pending counts, avg FRT, avg resolution today | 5 | Must |
| S15-3 | Conversation volume chart — daily/weekly/monthly, by inbox/team/agent filter | 5 | Must |
| S15-4 | Agent performance table — CSAT, FRT, resolved count, sortable | 5 | Must |
| S15-5 | CSAT survey — post-resolution survey via widget/email, rating + comment | 5 | Must |
| S15-6 | CSAT dashboard — score trends, response rate, verbatim comments | 3 | Should |
| S15-7 | Export — CSAT CSV, conversation metrics CSV, date-range picker | 3 | Should |

**Sprint total: 34 pts**

---

### Sprint 16 · 2027-01-19 → 2027-02-01
**Goal:** SLA policies, custom roles, SAML SSO.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S16-1 | SLA policy model — FRT / next-response / resolution thresholds, business hours mode | 5 | Must |
| S16-2 | SLA application — attach policy to inbox, calculate deadlines per conversation | 5 | Must |
| S16-3 | SLA breach notifications — BullMQ scheduled check, in-app + email alert | 5 | Must |
| S16-4 | SLA metrics report — adherence %, breach count by inbox/team | 3 | Should |
| S16-5 | Custom roles — role builder, granular permission matrix, assign to agents | 8 | Must |
| S16-6 | SAML 2.0 SSO — SP metadata, IdP config, role mapping from assertion attributes | 8 | Should |

**Sprint total: 34 pts**

---

### Sprint 17 · 2027-02-02 → 2027-02-15
**Goal:** Audit logs, companies/CRM, webhooks & platform API.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S17-1 | Audit log model — entity, action, changed fields diff (JSONB), user, IP, request ID | 5 | Must |
| S17-2 | Audit log viewer — filter by entity/user/date, expandable diff view | 3 | Should |
| S17-3 | Companies — create, domain, description, custom attrs, contact → company association | 8 | Must |
| S17-4 | Company profile page — contacts list, conversation history, notes | 3 | Should |
| S17-5 | Account + inbox-level webhooks — event subscriptions, signing secret, delivery retries | 5 | Must |
| S17-6 | Dashboard apps — embed URL as conversation side panel, postMessage context bridge | 3 | Should |
| S17-7 | Platform app API — OAuth registration, manage entities on behalf of accounts | 5 | Should |

**Sprint total: 32 pts**

---

## Phase 7 — Mobile

---

### Sprint 18 · 2027-02-16 → 2027-03-01
**Goal:** Expo app — auth, conversation list, basic messaging.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S18-1 | Expo project init — Expo Router, shared Zustand stores + Zod types from monorepo | 5 | Must |
| S18-2 | Mobile auth — sign-in screen, Google OAuth via expo-auth-session, session persistence | 5 | Must |
| S18-3 | Conversation list — infinite scroll, unread badge, pull-to-refresh | 8 | Must |
| S18-4 | Conversation view — message thread, reply composer, attachments (expo-image-picker) | 8 | Must |
| S18-5 | WebSocket — connect on app foreground, disconnect on background | 3 | Must |
| S18-6 | FCM push notifications — expo-notifications, tap notification opens conversation | 5 | Must |

**Sprint total: 34 pts**

---

### Sprint 19 · 2027-03-02 → 2027-03-15
**Goal:** Mobile — full agent workflow, notifications, offline support.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S19-1 | Mobile: assign conversation, change status, add label | 5 | Must |
| S19-2 | Mobile: private notes, canned response picker | 3 | Must |
| S19-3 | Mobile: contact profile view | 3 | Should |
| S19-4 | Mobile: agent availability toggle | 2 | Must |
| S19-5 | Offline queue — store outgoing messages in MMKV, replay on reconnect | 5 | Should |
| S19-6 | Notification settings — per-type enable/disable, badge count on app icon | 3 | Should |
| S19-7 | EAS Build + OTA update config for staging + production | 5 | Must |
| S19-8 | App Store + Play Store submission (TestFlight / Internal Testing track) | 5 | Must |

**Sprint total: 31 pts**

---

## Phase 8 — Hardening & Launch

---

### Sprint 20 · 2027-03-16 → 2027-03-29
**Goal:** Performance, security hardening, public documentation, soft launch.

#### Stories

| # | Story | Points | Priority |
|---|---|---|---|
| S20-1 | Security audit — OWASP top 10 review, rate limiting on auth routes, CSP headers | 8 | Must |
| S20-2 | API rate limiting — per-account limits via Redis token bucket, 429 responses | 5 | Must |
| S20-3 | Performance — DB query analysis (pg_stat_statements), missing index fixes | 5 | Must |
| S20-4 | Typesense full-text search — index conversations, messages, contacts, articles | 5 | Must |
| S20-5 | OpenAPI docs — auto-generated from Hono Zod routes, published at `/docs` | 3 | Should |
| S20-6 | Onboarding flow — first-time setup wizard (inbox, invite agents, widget install) | 5 | Must |
| S20-7 | End-to-end tests — Playwright suite covering sign-in → conversation → resolve | 5 | Should |
| S20-8 | Production deploy — custom domain, SSL, env secrets, monitoring (Sentry + Axiom) | 3 | Must |

**Sprint total: 39 pts**

---

## Backlog (Post-launch)

| Item | Notes |
|---|---|
| TikTok DM channel | Business API access required |
| LINE channel | Mainly Japan / SE Asia |
| Voice calling | Twilio WebRTC, call recording |
| Advanced search (Typesense Pro) | Faceted, cross-entity |
| Capacity policies | Per-agent conversation caps, exclusion rules |
| Multi-language portal | Locale routing on Help Center |
| White-label / hide branding | Remove FlowChat badge for enterprise |
| Contact enrichment | IP lookup, domain-based company auto-link |
| CSAT review notes | Agent annotates CSAT responses |
| Conversation required attributes | Force custom field fill before resolution |

---

## Velocity & Estimation Guide

| Size | Points | Examples |
|---|---|---|
| XS | 1–2 | Toggle UI setting, add a DB column |
| S | 3 | Simple CRUD page, API endpoint with validation |
| M | 5 | Feature with UI + API + job + tests |
| L | 8 | Complex integration, multi-step flow, new service |
| XL | 13 | New channel, real-time subsystem |

> XL items must be broken down before sprint planning. Nothing > 8 pts enters a sprint without decomposition.

---

## Sprint Ceremonies

| Ceremony | Cadence | Duration |
|---|---|---|
| Sprint Planning | Monday of sprint start | 2 h |
| Daily Standup | Every weekday | 15 min |
| Sprint Review | Last Friday of sprint | 1 h |
| Retrospective | Last Friday of sprint (after review) | 45 min |
| Backlog Refinement | Wednesday, week 1 of sprint | 1 h |

---

*Last updated: 2026-06-05 · 20 sprints · Sprint 6 extended: CRM + email marketing automation · Target launch: 2027-03-29*
