# FlowChat — Industry Standard Email Marketing

> **Purpose:** Define what “email marketing complete” means for FlowChat outbound marketing.  
> **Scope:** Campaign-based marketing on CRM contacts — **not** the email support inbox (Sprint 7).  
> **Primary stories:** S6M-1 … S6M-44 (Marketing Campaign Redesign). Foundation CRM/consent from S6-10 – S6-13 remains in force.  
> **Benchmark:** HubSpot Marketing Hub, Mailchimp, Brevo (Sendinblue), ActiveCampaign — SMB tier.

---

## Gate rule

Email marketing is **complete** when every **Must** S6M story is implemented and verified in staging.

**Campaign-only model (locked):** No marketing email is sent when a contact is created, imported, or resolved in chat. All outreach starts from **Marketing → Campaigns** with explicit recipient selection.

Transactional mail (agent invites, missed-chat alerts, double opt-in confirm) uses separate paths — not marketing campaigns.

---

## 1. Audience & consent (S6-10, S6M-6 – S6M-10)

| Requirement | Standard | Story |
|---|---|---|
| Contact email status | subscribed / unsubscribed / bounced / complained | S6-10 |
| Global suppression | Hard-bounced and complained addresses never emailed | S6-10, S6M-8, S6M-44 |
| Explicit recipients | Agent selects contacts in campaign wizard | S6M-6 |
| Static segments | Optional import into recipient picker (not auto-send) | S6M-7 |
| Segment preview | Count before import | S6M-7 |
| Lawful send | Only `subscribed` contacts at launch | S6M-8 |
| No CRM triggers | Contact create/import/chat does not enroll or send | S6M-9 |

---

## 2. Content & sender (S6M-11 – S6M-15, S6M-21 – S6M-25)

| Requirement | Standard | Story |
|---|---|---|
| HTML + plain-text | Both versions; plain text auto-generated from HTML (editable) | S6M-11 |
| Merge tags | first_name (required), last_name, email, phone, contact_message, links, agent | S6M-15, S6M-41 |
| contact_message | Per-recipient resolution via source mode (note / chat / fallback) | S6M-19, §6.1 screens |
| Template library | Standalone reusable templates; duplicate / archive | S6M-11 |
| Save as template | In-wizard checkbox per step | S6M-13 |
| Snapshot at launch | Running campaign immune to later template edits | S6M-14 |
| Full-screen composer | Enterprise rich editor overlay | S6M-12 |
| Test send | Mandatory per campaign draft before admin launch | S6M-23 |
| Verified domain | Send from workspace verified domain | S6M-24 |
| From / reply-to | Configurable per campaign / workspace | S6M-21 |
| Signature footer | Agent name + signature HTML | S6M-21 |
| Compliance footer | Physical address + unsubscribe (system-appended) | S6M-25 |
| No attachments | Disabled in UI and API | S6M-20 |

---

## 3. Multi-step campaigns (S6M-1 – S6M-5, S6M-16 – S6M-18, S6M-39)

| Requirement | Standard | Story |
|---|---|---|
| Campaign wizard | Recipients → Sequence → Sender → Review | S6M-39 |
| Campaign ID on create | Draft persisted immediately | S6M-1 |
| Multi-step sequence | 1..N emails with explicit date+time per step | S6M-16, S6M-17 |
| Schedule validation | Each step after previous; all future at launch | S6M-18 |
| Bulk template apply | Multi-select templates → multiple steps | S6M-16 |
| Admin launch only | Agents draft; administrators launch/pause/cancel | S6M-3, S6M-32 |
| Pause / cancel | Stop pending sends; summary of impact | S6M-4 |
| Duplicate campaign | Copy steps/snapshots; recipients not copied | S6M-5 |

---

## 4. Delivery infrastructure (S6M-24, S6M-31 – S6M-34)

| Requirement | Standard | Story |
|---|---|---|
| BYOK providers | Resend, SendGrid, Mailgun per tenant | S7B, S6M-24 |
| Background scheduler | Worker + Vercel Cron backup | S6M-33 |
| Idempotent sends | No double-send per step+recipient | S6M-33, S6M-42 |
| Webhooks | delivered, opened, clicked, bounced, complained | S6M-34 |
| Pre-flight health | Provider, domain, cron on review + settings | S6M-24 |
| Safe errors | No raw provider JSON to client | S6M-31 |

---

## 5. Stop rules & deliverability (S6M-36 – S6M-38, S6M-42, S6M-44)

| Requirement | Standard | Story |
|---|---|---|
| Hard bounce | Stop remaining steps for recipient in campaign; global suppress | S6M-36 |
| Soft bounce | Retry once; second soft → hard bounce treatment | S6M-36 |
| Unsubscribe | One-click; global suppress + stop campaign steps | S6M-37, S6M-25 |
| Reply stop | In-Reply-To match (Sprint 7 inbox); ESP fallback until live | S6M-38 |
| Spam complaint | Global suppress + stop campaign steps (ESP standard) | S6M-44 |
| Send engine guard | Skip stopped recipients before each step | S6M-42 |

---

## 6. Analytics & contact history (S6M-26 – S6M-30, S6M-43)

| Requirement | Standard | Story |
|---|---|---|
| Campaign overview | Funnel + stop metrics + live progress | S6M-26 |
| Per-step stats | Open/click/stopped by reason | S6M-27 |
| Recipient table | Filters + stopped reasons | S6M-28 |
| Per-recipient drill-down | Expand row per-step timeline | S6M-43 |
| Activity log | Send attempts, webhooks, errors (sanitized) | S6M-26 |
| Contact timeline | Campaign events on profile | S6M-30 |
| CSV export | Recipient × step × status | S6M-29 |

**Canonical enums, API contract, and full story traceability:** [marketing-module-screens.md](marketing-module-screens.md) §0.1, §1.2, §1.3, §3.1, §7.1.  
**Visual design, branding, components:** [marketing-module-design.md](marketing-module-design.md).  
**Database schema (planned):** [marketing-module-migration.md](marketing-module-migration.md).

---

## 7. Deprecated (superseded by S6M)

The following **S6-15 / S6-16 CRM-triggered workflow** capabilities are **retired** in favour of campaign-only outreach:

| Retired | Replacement |
|---|---|
| Contact created → welcome drip | Manual campaign with explicit recipients |
| Label added / conversation resolved triggers | Campaign wizard only |
| Workflow builder in Marketing nav | Campaigns + Templates |
| `triggerMarketingWorkflows` on CRM paths | Removed (S6M-9) |

Historical S6-14 broadcast and S6-15/16 workflow stories remain in the workbook as completed foundation work; S6M is the authoritative model going forward.

---

## Definition of Done (sign-off checklist)

### Marketer journey
- [ ] Create campaign draft; campaign ID assigned immediately
- [ ] Select recipients explicitly (optional segment import)
- [ ] Build multi-step sequence with date+time per email
- [ ] Configure message source mode for `{{contact_message}}` if used
- [ ] Send mandatory test email; admin launches campaign
- [ ] View campaign report with per-step and per-recipient stats

### Contact journey
- [ ] New CRM contact receives **no** marketing email automatically
- [ ] Unsubscribe link suppresses future marketing
- [ ] Hard bounce and spam complaint suppress address
- [ ] Reply to campaign email stops follow-ups for that recipient only

### Administrator journey
- [ ] Sending domain verified; BYOK or platform provider connected
- [ ] Cron health green on settings panel
- [ ] Webhook events update delivery status within 5 min
- [ ] Launch audit shows who launched and when

---

## Explicitly out of scope (S6M v1)

| Item | Where |
|---|---|
| CRM-triggered automations | Retired — S6M-9 |
| Inbound email support inbox | Sprint 7 (reply-stop primary path) |
| A/B subject tests | Backlog |
| Send-time timezone optimization | Backlog |
| File attachments in campaigns | S6M-20 |
| WhatsApp / SMS campaigns | Sprint 14 |

---

## Comparison to market

| Capability | Mailchimp / Brevo | FlowChat target (S6M) |
|---|---|---|
| Contact CRM | ✅ | S6-1 – S6-7 |
| Explicit recipient campaigns | ✅ | S6M-6 – S6M-10 |
| Multi-step dated sequences | ✅ | S6M-16 – S6M-18 |
| Template library + merge tags | ✅ | S6M-11 – S6M-15 |
| Mandatory test send | ✅ | S6M-23 |
| Stop on bounce/unsub/reply | ✅ | S6M-36 – S6M-38 |
| Stop on spam complaint | ✅ | S6M-44 |
| Open/click tracking | ✅ | S6M-34, S6M-26 |
| CRM auto-drip on signup | ✅ | **No** — campaign-only by design |
| Support inbox email | ✅ (different product) | Sprint 7 |

---

*Last updated: 2026-06-13 · S6M Marketing Campaign Redesign · Resend/SendGrid/Mailgun BYOK · Worker + Vercel Cron*
