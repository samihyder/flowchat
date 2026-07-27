# FlowChat — Pricing Packages (Full Detail)

> **Product:** FlowChat by Mutex Systems  
> **Packages:** 4 tiers from **$0 → $99 USD / month** (Business ≈ $100 ceiling)  
> **Billing unit:** Per workspace (account), not per conversation unless noted  
> **Currency:** USD  
> **Scope of features:** Web product S1–S17 & S20 (chat, CRM, marketing, omnichannel, automation, AI, help center, reports, enterprise)  
> **Out of scope for these packages:** Expo mobile apps (S18–S19) — priced separately later  
> **Design / branding:** [design/sprints-s7-s20-design-instructions.md](design/sprints-s7-s20-design-instructions.md) (Mutex aqua `#06B6D4`)  
> **Product references:** [features.md](features.md) · [sprints.md](sprints.md) · [email-marketing-standard.md](email-marketing-standard.md)

---

## Table of contents

1. [At-a-glance](#1-at-a-glance)  
2. [How packaging works](#2-how-packaging-works)  
3. [Package 1 — Free ($0)](#3-package-1--free--0--month)  
4. [Package 2 — Starter ($29)](#4-package-2--starter--29--month)  
5. [Package 3 — Growth ($59)](#5-package-3--growth--59--month)  
6. [Package 4 — Business ($99)](#6-package-4--business--99--month)  
7. [Full feature matrix](#7-full-feature-matrix)  
8. [Limits & quotas detail](#8-limits--quotas-detail)  
9. [Add-ons](#9-add-ons)  
10. [What is never included / external costs](#10-what-is-never-included--external-costs)  
11. [Sprint → package mapping](#11-sprint--package-mapping)  
12. [Entitlements & feature flags](#12-entitlements--feature-flags)  
13. [Upgrade / downgrade / overage rules](#13-upgrade--downgrade--overage-rules)  
14. [Billing & commercial terms](#14-billing--commercial-terms)  
15. [Pricing page copy & UI](#15-pricing-page-copy--ui)  
16. [FAQ](#16-faq)  
17. [Changelog](#17-changelog)

---

## 1. At-a-glance

| | **Free** | **Starter** | **Growth** | **Business** |
|---|---|---|---|---|
| **Monthly price** | **$0** | **$29** | **$59** | **$99** |
| **Annual (optional)** | $0 | $278 / yr (−20%) | $566 / yr (−20%) | $950 / yr (−20%) |
| **One-line pitch** | Try web live chat | Support + light CRM & email | Omnichannel + AI + marketing | SLA, SSO, Captain AI, audit |
| **Ideal customer** | Founder testing widget | 2–5 person support | Sales + CS on many channels | Mid-market / regulated teams |
| **Agent seats** | 2 | 5 | 15 | 40 |
| **Contacts stored** | 500 | 5,000 | 25,000 | 100,000 |
| **Conversations / month** | 200 | 2,000 | 10,000 | 50,000 |
| **Inboxes** | 1 (web) | 3 | 10 | Unlimited (fair use) |
| **Highlighted on site** | — | — | **Most popular** | — |
| **Primary CTA** | Start free | Start Starter | Start Growth | Buy Business |

---

## 2. How packaging works

### 2.1 Principles

1. **Cumulative** — Higher packages include everything below them unless a limit is replaced by a higher quota.  
2. **Workspace-scoped** — One plan per FlowChat account/tenant.  
3. **Seats = billable agents** — Administrators who also agent count as seats. Inactive/deactivated users do not.  
4. **Provider fees separate** — Meta WhatsApp, Twilio SMS, Resend/SendGrid/Mailgun send volume, and third-party enrichment APIs are paid to those vendors (especially under BYOK).  
5. **Marketing ≠ support email** — Marketing campaigns (S6M) are separate from the email **support inbox** (S7). Both may appear on paid tiers with different quotas.  
6. **No CRM-triggered marketing** — On all packages that include marketing, outreach only starts from **Marketing → Campaigns** with explicit recipients (S6M-9).

### 2.2 Service pillars (how we split the product)

| Pillar | Free | Starter | Growth | Business |
|--------|:----:|:-------:|:------:|:--------:|
| A. Live chat & inbox ops | ● | ● | ● | ● |
| B. CRM & contacts | ○ | ● | ● | ● |
| C. Email support channel | — | ● | ● | ● |
| D. Omnichannel (WA/social/SMS/API) | — | — | ● | ● |
| E. Email marketing (S6M) | — | Lite | Full | Full+ |
| F. Channel campaigns (WA/SMS) | — | — | ● | ● |
| G. Automation & macros | — | Macros | Rules + macros | Rules + macros |
| H. AI assist | — | — | Suggestions | Suggestions + Captain |
| I. Help Center | — | — | 1 portal | 5 portals |
| J. Reports | Basic | Overview | Full | Full |
| K. Enterprise (SLA, SAML, roles, audit) | — | — | — | ● |
| L. Ecosystem (Lead Monitor, LeadSnapper, Documents) | — | — | ● | ● |
| M. Connected services / BYOK | — | — | ● | ● |

● = included · ○ = basic only · — = not included

---

## 3. Package 1 — Free · $0 / month

### 3.1 Summary

| Field | Value |
|-------|--------|
| **Code** | `free` |
| **Price** | $0 USD / month |
| **Trial** | N/A (always free) |
| **Positioning** | “Get every conversation in flow — start with web chat.” |
| **Who it’s for** | Solo founders, side projects, evaluating FlowChat before paying |

### 3.2 Capacity

| Resource | Limit |
|----------|------:|
| Agent seats | 2 |
| Teams | 1 |
| Contacts | 500 |
| Conversations created / calendar month | 200 |
| Inboxes | 1 (web widget only) |
| Allowlisted widget domains | 3 |
| Canned responses | 10 |
| File attachments / message | 5 (max 5 MB each) |
| Message search history | Last 14 days |
| Webhooks | 0 |
| API keys (CRM integrations) | 0 |
| Marketing sends | 0 |
| AI calls | 0 |
| Data retention (conversations) | 90 days |

### 3.3 Included services (full detail)

#### A. Live chat & inbox

- Embeddable web widget (Mutex / FlowChat branding badge **required**)
- Pre-chat form (name, email)
- Typing indicators, basic attachments
- Conversation statuses: open / pending / resolved / snoozed
- Assign to agent, priority (urgent / high / medium / low)
- Business hours + offline greeting
- Domain allowlist (up to 3)
- CSAT survey on resolve (widget)
- Agent availability: online / busy / offline

#### B. Contacts (basic)

- Auto-created contacts from widget conversations
- View contact name, email, phone if captured
- Conversation history on contact
- **No** CSV import, merge, custom attributes UI, or companies

#### C. Team

- Invite up to 2 agents (email invite)
- Role: administrator or agent (fixed roles only)
- One team

### 3.4 Explicitly excluded

- Email / WhatsApp / Messenger / Instagram / Telegram / SMS / API channels  
- Marketing campaigns & segments  
- Automation rules & macros  
- AI suggestions / Captain  
- Help Center  
- Reports beyond simple open/resolved counts in inbox views  
- SLA, SAML, custom roles, audit viewer  
- BYOK credentials  
- Documents, Lead Monitor, LeadSnapper  
- Removal of “Powered by FlowChat”  

### 3.5 Support

| Channel | SLA |
|---------|-----|
| Docs / community | Best effort |
| Email / chat support | Not included |

### 3.6 Upgrade triggers (product prompts)

Show upgrade when user hits: seat cap, conversation cap, tries to add email inbox, tries Marketing, Automation, or Reports export.

---

## 4. Package 2 — Starter · $29 / month

### 4.1 Summary

| Field | Value |
|-------|--------|
| **Code** | `starter` |
| **Price** | $29 USD / month · $278 / year (−20%) |
| **Positioning** | “Support inbox + CRM basics for a small team.” |
| **Who it’s for** | 2–5 person support or founder-led CS |

### 4.2 Capacity

| Resource | Limit |
|----------|------:|
| Agent seats | 5 |
| Teams | 3 |
| Contacts | 5,000 |
| Conversations / month | 2,000 |
| Inboxes | 3 (mix of web + email; max **1 email** inbox) |
| Allowlisted domains | 10 |
| Canned responses | 50 |
| Macros | 20 (personal + global) |
| Labels | 50 |
| CSV import rows / job | 1,000 |
| Marketing — active campaigns | 1 |
| Marketing — sends / month | 1,000 |
| Marketing — segments | 3 |
| Marketing — templates | 10 |
| Webhooks | 2 |
| API keys | 1 |
| AI calls | 0 |
| Message search history | Full retained history (per retention) |
| Data retention | 24 months |
| Attachments / message | 15 (max 15 MB each) |

### 4.3 Included services (full detail)

#### Everything in Free, and:

#### A. Inbox ops (expanded)

- Private notes, @mentions  
- Read receipts  
- Snooze with wake time  
- Labels on conversations & contacts  
- Remove widget “Powered by” badge  
- Widget color / launcher basics  

#### B. CRM

- Contact types: visitor / lead / customer  
- Notes, labels, custom attributes  
- Full-text contact search  
- CSV import (quota above)  
- Block visitor  

#### C. Email support channel (S7)

- One email inbox: forwarding address and/or ingest webhook  
- Thread continuity (`In-Reply-To` / `References`)  
- Agent reply via platform mail or connected sender  
- Quoted reply collapse in thread  

#### D. Marketing — Lite (S6M)

- Campaign wizard with **explicit recipients only** (no CRM auto-enroll)  
- 1 active (non-draft) campaign at a time  
- Up to 1,000 marketing emails / month  
- 3 static segments, 10 templates  
- Mandatory test send before admin launch  
- Unsubscribe / bounce / complaint stop (ESP webhooks)  
- Admin-only launch  

#### E. Automation — Macros only

- Personal & global macros  
- Run from conversation toolbar  
- **No** event-based automation rules  

#### F. Reports — Overview

- Open / resolved / pending counts  
- Basic average FRT if events exist  
- **No** CSV export, volume charts, or agent leaderboard  

#### G. Integrations

- Up to 2 account webhooks  
- 1 CRM API key (integrations v1)  

### 4.4 Explicitly excluded

- WhatsApp Cloud / Twilio WA, Messenger, Instagram, Telegram, SMS, API channel  
- Automation **rules** engine  
- AI features  
- Help Center portals  
- Channel (WA/SMS) campaigns  
- BYOK Connected services UI (may use platform Resend if enabled by host)  
- Documents module  
- Lead Monitor / LeadSnapper sync  
- SLA / SAML / custom roles / audit viewer  

### 4.5 Support

| Channel | Target |
|---------|--------|
| Email support | Response within 48 business hours |

---

## 5. Package 3 — Growth · $59 / month

### 5.1 Summary

| Field | Value |
|-------|--------|
| **Code** | `growth` |
| **Price** | $59 USD / month · $566 / year (−20%) |
| **Badge** | **Most popular** |
| **Positioning** | “Omnichannel inbox, automation, and AI assist for growing teams.” |
| **Who it’s for** | Sales + CS on web, email, WhatsApp, and social; active email marketing |

### 5.2 Capacity

| Resource | Limit |
|----------|------:|
| Agent seats | 15 |
| Teams | 10 |
| Contacts | 25,000 |
| Conversations / month | 10,000 |
| Inboxes | 10 (any allowed channel types) |
| Allowlisted domains | 50 |
| Canned responses | 200 |
| Macros | 100 |
| Automation rules | 50 |
| Labels | Unlimited (fair use) |
| CSV import rows / job | 10,000 |
| Marketing — active campaigns | Unlimited drafts; fair use concurrent sends |
| Marketing — sends / month | 10,000 |
| Marketing — segments | 50 |
| Marketing — templates | Unlimited (fair use) |
| Channel campaign recipients / month | 2,000 (WA/SMS) |
| Help Center portals | 1 |
| Help Center articles | Unlimited |
| AI calls / month (suggestions, summarize, rewrite, labels) | 2,000 |
| BYOK email credentials | 1 |
| BYOK AI credentials | 1 |
| BYOK enrichment providers | 2 |
| Webhooks | 10 |
| API keys | 5 |
| Data retention | 36 months |

### 5.3 Included services (full detail)

#### Everything in Starter, and:

#### D. Omnichannel (S8–S9)

| Channel | Capability |
|---------|------------|
| WhatsApp Cloud API | Inbox config, verify token, app secret, inbound text (media as available), outbound text, 24h window + templates |
| Facebook Messenger | Page connect, receive/send |
| Instagram DM | Business DM receive/send |
| Telegram | Bot token inbox |
| SMS (Twilio) | Inbound webhook + outbound |
| API channel | Signed webhook inbox + health |

- Channel badges on conversation list/thread  
- Per-inbox health indicator  

#### E. Marketing — Full (S6M)

- Full multi-step dated sequences  
- Pre-flight health, pause/cancel, duplicate  
- Per-campaign & per-recipient stats  
- Reply-stop via ESP + email-inbox Message-ID match  
- 10,000 sends / month  
- Platform Resend **or** 1 BYOK ESP credential  

#### F. Channel campaigns (S14)

- One-off WA/SMS campaigns from segment/contacts  
- Admin launch  
- Progress + sent/failed counts  
- 2,000 recipients / month  

#### G. Automation — Rules (S10)

- Triggers: conversation/message/contact events (as implemented)  
- Conditions AND/OR  
- Actions: assign, label, status, priority, note, message (per engine support)  
- Enable/disable, order, clone  
- Macros remain included  

#### H. AI assist (S11)

- Reply suggestions (insert to composer)  
- Thread summarize  
- Rewrite: formal / friendly / shorter  
- Label suggestions  
- Quota: 2,000 AI calls / month (platform and/or BYOK Anthropic)  

#### I. Help Center (S13)

- 1 public portal (slug, color, logo)  
- Categories + articles (draft / publish)  
- Public article listing & detail  
- Basic portal search  

#### J. Reports (S15)

- Overview dashboard (conversations, resolved, FRT, resolution time)  
- Agent performance table  
- Volume chart (daily/weekly)  
- CSV export (date range)  

#### K. CRM+

- Contact merge  
- Workspace companies (as available)  
- Enrichment suggestions via Connected services (optional BYOK)  

#### L. Connected services (S7B)

- Settings → Connected services  
- Email: Resend / SendGrid / Mailgun (1 credential)  
- AI: Anthropic (1 credential)  
- Encrypted at rest (`CREDENTIALS_ENCRYPTION_KEY`)  

#### M. Ecosystem & Documents

- Lead Monitor + LeadSnapper via `/api/integrations/v1/*` contact sync  
- Synced contacts may fire **conversation** automation only — never marketing enroll  
- CRM Documents (quotes/invoices) — standard templates  

### 5.4 Explicitly excluded

- AI Captain knowledge base + custom tools (S12)  
- SLA policies & breach engine  
- Custom role matrix & SAML SSO  
- Full audit log viewer  
- Dashboard apps & platform OAuth app console  
- Multiple Help Center portals / custom domain  
- Priority support  

### 5.5 Support

| Channel | Target |
|---------|--------|
| Email support | Within 24 business hours |

---

## 6. Package 4 — Business · $99 / month

### 6.1 Summary

| Field | Value |
|-------|--------|
| **Code** | `business` |
| **Price** | $99 USD / month · $950 / year (−20%) |
| **Ceiling note** | Top package in the $0–$100 band |
| **Positioning** | “Enterprise-ready: SLA, SSO, Captain AI, and audit.” |
| **Who it’s for** | Teams that need compliance, larger seats, and AI knowledge assistants |

### 6.2 Capacity

| Resource | Limit |
|----------|------:|
| Agent seats | 40 (then add-on seats) |
| Teams | Unlimited (fair use) |
| Contacts | 100,000 |
| Conversations / month | 50,000 |
| Inboxes | Unlimited (fair use) |
| Allowlisted domains | Unlimited (fair use) |
| Automation rules | 200 |
| Macros | Unlimited (fair use) |
| Marketing sends / month | 50,000 |
| Channel campaign recipients / month | 10,000 |
| Help Center portals | 5 |
| AI calls / month | 15,000 |
| BYOK email credentials | 5 |
| BYOK AI credentials | 3 |
| BYOK enrichment | Unlimited providers configured |
| Webhooks | 25 |
| API keys | 25 |
| Dashboard apps | 10 |
| Data retention | 60 months (or per DPA) |
| API rate limit | Highest tier (see infra) |

### 6.3 Included services (full detail)

#### Everything in Growth, and:

#### H+. AI Captain (S12)

- Multiple AI assistants  
- Knowledge: URL sync + PDF upload, chunk/embed status  
- Copilot side panel (multi-turn)  
- Built-in tools: FAQ lookup, handoff, label, priority, note, resolve  
- Custom HTTP tools (up to 15)  
- 15,000 AI calls / month  

#### K. Enterprise access (S16)

- **SLA policies** — FRT / resolution thresholds, business-hours mode  
- Deadlines on conversations + breach notifications  
- SLA adherence reporting  
- **Custom roles** — permission matrix (conversations, contacts, reports, settings, knowledge)  
- **SAML 2.0 SSO** — IdP config, ACS URL, attribute → role mapping  

#### L. Audit & platform (S17)

- Audit log viewer — filter by entity/user/date, expandable diffs  
- Account + inbox webhooks at higher caps  
- Dashboard apps (embed URL + postMessage context)  
- Platform app OAuth registration (as shipped)  

#### I+. Help Center

- Up to 5 portals  
- Custom domain support  
- Nested categories  
- Insert article into agent reply  

#### J+. Search & launch (S20)

- Workspace search across conversations, contacts, articles  
- Guided onboarding wizard  
- Higher API rate limits  
- 429 friendly messaging  

#### Marketing / campaigns (raised quotas)

- 50,000 email sends / month  
- 10,000 channel-campaign recipients / month  
- Multiple BYOK ESP credentials  

### 6.4 Support

| Channel | Target |
|---------|--------|
| Priority email + in-app | 8 business-hour response target |
| Onboarding | 1× setup call included |

### 6.5 Commercial notes

- Suitable as default “top” self-serve plan under $100  
- Larger seat counts / custom retention / BAAs → sales-led (outside this doc)

---

## 7. Full feature matrix

Legend: **✓** included · **L** limited / lite · **—** not included · **B** basic only

### Channels & inbox

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| Web live chat widget | ✓ | ✓ | ✓ | ✓ |
| Pre-chat form | ✓ | ✓ | ✓ | ✓ |
| Business hours / offline | ✓ | ✓ | ✓ | ✓ |
| CSAT on widget | ✓ | ✓ | ✓ | ✓ |
| Remove FlowChat badge | — | ✓ | ✓ | ✓ |
| Email support inbox | — | L (1) | ✓ | ✓ |
| WhatsApp Cloud API | — | — | ✓ | ✓ |
| WhatsApp templates / 24h window | — | — | ✓ | ✓ |
| Facebook Messenger | — | — | ✓ | ✓ |
| Instagram DM | — | — | ✓ | ✓ |
| Telegram | — | — | ✓ | ✓ |
| SMS (Twilio) | — | — | ✓ | ✓ |
| API channel + signing | — | — | ✓ | ✓ |
| Channel health indicators | — | — | ✓ | ✓ |

### Conversations & agents

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| Assign / resolve / priority | ✓ | ✓ | ✓ | ✓ |
| Labels | — | ✓ | ✓ | ✓ |
| Private notes / @mentions | — | ✓ | ✓ | ✓ |
| Snooze | — | ✓ | ✓ | ✓ |
| Canned responses | L | ✓ | ✓ | ✓ |
| Macros | — | ✓ | ✓ | ✓ |
| Teams | L (1) | ✓ | ✓ | ✓ |
| Fixed roles admin/agent | ✓ | ✓ | ✓ | ✓ |
| Custom roles | — | — | — | ✓ |
| SAML SSO | — | — | — | ✓ |

### CRM

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| Contact profiles | B | ✓ | ✓ | ✓ |
| Notes / custom attributes | — | ✓ | ✓ | ✓ |
| CSV import | — | L | ✓ | ✓ |
| Contact merge | — | — | ✓ | ✓ |
| Companies | — | — | ✓ | ✓ |
| Enrichment (BYOK) | — | — | ✓ | ✓ |

### Marketing & campaigns

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| S6M campaign wizard | — | L | ✓ | ✓ |
| Multi-step sequences | — | L | ✓ | ✓ |
| Segments / templates | — | L | ✓ | ✓ |
| Admin launch only | — | ✓ | ✓ | ✓ |
| Stop: bounce / unsub / complaint / reply | — | ✓ | ✓ | ✓ |
| Campaign analytics | — | B | ✓ | ✓ |
| WA/SMS channel campaigns | — | — | ✓ | ✓ |

### Automation & AI

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| Automation rules | — | — | ✓ | ✓ |
| AI suggestions / summarize / rewrite | — | — | ✓ | ✓ |
| AI Captain + knowledge + tools | — | — | — | ✓ |

### Knowledge, reports, enterprise

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| Help Center portal | — | — | L (1) | ✓ (5) |
| Reports overview | B | ✓ | ✓ | ✓ |
| Agent table / charts / CSV | — | — | ✓ | ✓ |
| SLA policies & breaches | — | — | — | ✓ |
| Audit log viewer | — | — | — | ✓ |
| Dashboard apps | — | — | — | ✓ |
| Workspace search | — | — | — | ✓ |

### Platform & ecosystem

| Feature | Free | Starter | Growth | Business |
|---------|:----:|:-------:|:------:|:--------:|
| Webhooks | — | L | ✓ | ✓ |
| API keys | — | L | ✓ | ✓ |
| BYOK email / AI | — | — | ✓ | ✓ |
| Lead Monitor / LeadSnapper | — | — | ✓ | ✓ |
| Documents (DAS) | — | — | ✓ | ✓ |
| Priority support | — | — | — | ✓ |

---

## 8. Limits & quotas detail

### 8.1 Monthly counters (reset on billing anniversary UTC)

| Meter | Free | Starter | Growth | Business |
|-------|-----:|--------:|-------:|---------:|
| `conversations_created` | 200 | 2,000 | 10,000 | 50,000 |
| `marketing_emails_sent` | 0 | 1,000 | 10,000 | 50,000 |
| `channel_campaign_recipients` | 0 | 0 | 2,000 | 10,000 |
| `ai_calls` | 0 | 0 | 2,000 | 15,000 |

### 8.2 Standing caps (not monthly)

| Meter | Free | Starter | Growth | Business |
|-------|-----:|--------:|-------:|---------:|
| `seats` | 2 | 5 | 15 | 40 |
| `contacts` | 500 | 5,000 | 25,000 | 100,000 |
| `inboxes` | 1 | 3 | 10 | ∞* |
| `automation_rules` | 0 | 0 | 50 | 200 |
| `help_portals` | 0 | 0 | 1 | 5 |

\*Fair use — abuse may be rate-limited.

### 8.3 When a limit is hit

1. Soft warning at **80%** (banner in app).  
2. At **100%**: block creating the metered resource; show upgrade modal (Mutex primary CTA).  
3. Administrators can export data; billing portal link for upgrade.

---

## 9. Add-ons

Available on **Growth** and **Business** unless noted.

| Add-on | Price | Applies to | Effect |
|--------|------:|------------|--------|
| Extra agent seat | $4 / seat / mo | Growth, Business | +1 seat |
| AI pack | $20 / mo | Growth, Business | +10,000 `ai_calls` |
| Email send pack | $15 / mo | Starter+, | +25,000 marketing sends |
| Channel campaign pack | $15 / mo | Growth, Business | +5,000 recipients |
| Extra Help portal | $10 / mo | Growth | +1 portal (Growth only; Business already has 5) |
| Mobile apps (S18–S19) | TBD | All paid | Not sold in this $0–$100 set |

---

## 10. What is never included / external costs

| Item | Who pays |
|------|----------|
| Meta WhatsApp conversation fees | Customer → Meta |
| Twilio SMS / voice | Customer → Twilio |
| Resend / SendGrid / Mailgun when BYOK | Customer → provider |
| Enrichment API usage (PDL, Lusha, etc.) | Customer → provider |
| Custom domain DNS / certificates | Customer (Business Help Center) |
| SMS/WhatsApp template approval | Customer with Meta/Twilio |
| Legal / DPA custom negotiation | Sales (outside self-serve) |

Platform may offer a shared Resend key on Starter/Growth; volume still counts against plan send quota.

---

## 11. Sprint → package mapping

| Sprint / module | First package that unlocks it |
|-----------------|-------------------------------|
| S1–S5 Chat module | Free (core) → Starter (full ops) |
| S6 CRM | Starter |
| S6M Marketing | Starter (lite) → Growth (full) |
| S7 Email inbox | Starter |
| S7B BYOK | Growth |
| S8 WhatsApp Cloud | Growth |
| S9 Social / SMS / API | Growth |
| S10 Automation rules | Growth (macros from Starter) |
| S11 AI suggestions | Growth |
| S12 AI Captain | Business |
| S13 Help Center | Growth (1) → Business (5) |
| S14 Channel campaigns | Growth |
| S15 Reports | Starter overview → Growth full |
| S16 SLA / roles / SAML | Business |
| S17 Audit / apps | Business |
| S20 Search / onboarding UX | Business (wizard may appear earlier as UX only) |
| S18–S19 Mobile | **Not in these packages** |

---

## 12. Entitlements & feature flags

### 12.1 Plan enum

```ts
type PlanCode = 'free' | 'starter' | 'growth' | 'business';
```

### 12.2 Flag matrix

| Flag | Free | Starter | Growth | Business |
|------|:----:|:-------:|:------:|:--------:|
| `channels.web` | ✓ | ✓ | ✓ | ✓ |
| `channels.email` | — | ✓ | ✓ | ✓ |
| `channels.whatsapp` | — | — | ✓ | ✓ |
| `channels.facebook` | — | — | ✓ | ✓ |
| `channels.instagram` | — | — | ✓ | ✓ |
| `channels.telegram` | — | — | ✓ | ✓ |
| `channels.sms` | — | — | ✓ | ✓ |
| `channels.api` | — | — | ✓ | ✓ |
| `crm.import` | — | ✓ | ✓ | ✓ |
| `crm.companies` | — | — | ✓ | ✓ |
| `marketing.campaigns` | — | `lite` | `full` | `full` |
| `campaigns.channel` | — | — | ✓ | ✓ |
| `automation.macros` | — | ✓ | ✓ | ✓ |
| `automation.rules` | — | — | ✓ | ✓ |
| `ai.suggestions` | — | — | ✓ | ✓ |
| `ai.captain` | — | — | — | ✓ |
| `help_center` | — | — | ✓ | ✓ |
| `reports.overview` | `basic` | ✓ | ✓ | ✓ |
| `reports.export` | — | — | ✓ | ✓ |
| `sla` | — | — | — | ✓ |
| `roles.custom` | — | — | — | ✓ |
| `auth.saml` | — | — | — | ✓ |
| `audit.viewer` | — | — | — | ✓ |
| `credentials.byok` | — | — | ✓ | ✓ |
| `ecosystem.leadsnapper` | — | — | ✓ | ✓ |
| `ecosystem.lead_monitor` | — | — | ✓ | ✓ |
| `documents` | — | — | ✓ | ✓ |
| `widget.remove_branding` | — | ✓ | ✓ | ✓ |
| `support.priority` | — | — | — | ✓ |

Store numeric quotas on `account_plans` or billing customer metadata (`seats`, `ai_calls`, etc.).

---

## 13. Upgrade / downgrade / overage rules

### Upgrade

- Immediate entitlement expand; prorated charge for remainder of cycle.  
- Quotas reset meters only on anniversary (not mid-cycle) unless noted.

### Downgrade

- Takes effect **next** billing anniversary (default).  
- If usage exceeds new caps (seats, contacts): block invites / imports until within cap; do not auto-delete data for 30 days.

### Overage

- No silent hard-delete.  
- Prefer upgrade CTA; optional add-on purchase.  
- Hosting operator may enable hard block on `conversations_created` for Free/Starter.

---

## 14. Billing & commercial terms

| Term | Policy |
|------|--------|
| Currency | USD |
| Tax | Add VAT/GST where required at checkout |
| Payment | Card (Stripe or equivalent); Business may invoice net-15 via sales |
| Refunds | 14-day money-back on first paid month (Starter/Growth/Business), excluding add-ons already consumed |
| Fair use | Automation/API abuse may throttle |
| DPA | Available on Business; standard ToS on Free–Growth |
| Logo rights | Free may show customer in “used by” only with opt-in |

---

## 15. Pricing page copy & UI

### Copy

- **Headline:** Simple packages. Every conversation in flow.  
- **Subhead:** From free web chat to $99 Business — choose what your team needs.  
- **Toggle:** Monthly / Annual (save 20%)  
- **Growth badge:** Most popular  
- **Footnote:** Provider fees (Meta, Twilio, ESP) not included. Mobile apps sold separately.

### UI (Mutex)

Follow [design/sprints-s7-s20-design-instructions.md](design/sprints-s7-s20-design-instructions.md):

- Background `#F9FAFB`; cards white, `rounded-xl`, `border-gray-200`  
- Growth: `ring-2 ring-primary-500`  
- CTA primary `#06B6D4` → hover `#0891B2`  
- Free CTA: secondary outline  
- No indigo/purple pricing theme  

### Card content order

1. Plan name  
2. Price + period  
3. One-line pitch  
4. Seat / conversation highlight  
5. Feature bullets (6–8 max on card; “See all features” → matrix)  
6. CTA  

---

## 16. FAQ

**Can I use WhatsApp on Starter?**  
No. WhatsApp and other social/SMS channels start on **Growth**.

**Do marketing emails count as conversations?**  
No. Marketing sends use `marketing_emails_sent`. Support email threads use conversations.

**Is LeadSnapper included?**  
Integration sync is included from **Growth** up. The Chrome extension may be distributed separately; check LeadSnapper docs.

**What’s the difference between Growth AI and Business Captain?**  
Growth: rewrite/suggest/summarize on a conversation. Business: knowledge-grounded assistants, document ingest, copilot tools.

**Is $99 the enterprise plan?**  
It is the top **self-serve** plan in the $0–$100 band. Larger contracts (100+ seats, custom DPA, dedicated success) are sales-assisted.

**Are mobile apps included?**  
Not in these four packages (S18–S19 excluded).

---

## 17. Changelog

| Date | Change |
|------|--------|
| 2026-07-27 | Initial packages $0 / $29 / $59 / $99 |
| 2026-07-27 | Full-detail document: quotas, matrix, flags, FAQ, sprint map |

---

*FlowChat pricing packages — full detail · Mutex Systems · $0 · $29 · $59 · $99*
