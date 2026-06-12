# FlowChat — Industry Standard Email Marketing Automation

> **Purpose:** Define what “email marketing automation complete” means for Sprint 6.  
> **Scope:** Outbound marketing email on CRM contacts — **not** the email support inbox (Sprint 7).  
> **Reference:** Stories tracked in [sprints.md](sprints.md) Sprint 6 (S6-10 – S6-23).  
> **Benchmark:** HubSpot Marketing Hub, Mailchimp, Brevo (Sendinblue), ActiveCampaign — SMB tier.

---

## Gate rule

Sprint 6 email marketing is **complete** when every **Must** item below is implemented and verified in staging.

Transactional mail (agent invites, missed-chat alerts) already uses Resend — marketing mail reuses the same provider with separate templates, suppression, and tracking.

---

## 1. Audience & consent (S6-10, S6-11)

| Requirement | Standard | Story |
|---|---|---|
| Contact email status | subscribed / unsubscribed / bounced / complained | S6-10 |
| Global suppression | Hard-bounced and complained addresses never emailed | S6-10 |
| Static lists | Manual lists; add/remove contacts | S6-11 |
| Dynamic segments | Filter by label, attribute, last seen, subscription, conversation history | S6-11 |
| Segment preview | Count + sample contacts before send | S6-11 |
| Lawful send | Only `subscribed` contacts in marketing sends | S6-10 |

---

## 2. Content & sender (S6-12, S6-13)

| Requirement | Standard | Story |
|---|---|---|
| HTML + plain-text | Both versions; auto text fallback from HTML | S6-12 |
| Merge tags | `{{first_name}}`, `{{email}}`, custom contact attributes | S6-12 |
| Template library | Reusable templates; duplicate / archive | S6-12 |
| Test send | Send preview to agent email before campaign | S6-12 |
| Verified domain | Send from workspace verified domain (Resend) | S6-13 |
| From / reply-to | Configurable per workspace | S6-13 |
| Compliance footer | Physical address + unsubscribe link in every marketing email | S6-13, S6-17 |

---

## 3. Broadcast campaigns (S6-14)

| Requirement | Standard | Story |
|---|---|---|
| One-time send | Pick segment + template → send now or schedule | S6-14 |
| Queue & throttle | BullMQ dispatch; respect provider rate limits | S6-14 |
| Per-recipient status | queued → sent → delivered / bounced / failed | S6-14, S6-18 |
| Pause / cancel | Stop in-flight campaign where provider allows | S6-14 |

---

## 4. Automation workflows (S6-15, S6-16)

| Requirement | Standard | Story |
|---|---|---|
| Triggers | Contact created, label added, conversation resolved, manual enrollment | S6-15 |
| Steps | Send email, wait (delay), branch (opened / clicked / not opened), add label, exit | S6-15 |
| Drip sequences | Multi-step delays (e.g. day 0, 3, 7) | S6-16 |
| Re-entry rules | Configurable: once per contact vs allow re-enroll | S6-16 |
| Enable / disable | Toggle workflow without deleting | S6-15 |
| CRM integration | Workflows can use segment membership and contact attributes | S6-11, S6-15 |

---

## 5. Compliance & deliverability (S6-17, S6-10)

| Requirement | Standard | Story |
|---|---|---|
| One-click unsubscribe | Public page; instant suppression | S6-17 |
| List-Unsubscribe header | RFC 8058 one-click where supported | S6-17 |
| Preference center | Opt out of marketing; transactional may still send | S6-17 |
| Bounce handling | Hard bounce → suppress contact automatically | S6-18 |
| Complaint handling | Spam complaint → suppress + alert admin | S6-18 |
| Double opt-in | Optional confirm-before-subscribe flow | S6-21 |

---

## 6. Analytics & contact history (S6-19, S6-20)

| Requirement | Standard | Story |
|---|---|---|
| Campaign metrics | Sent, delivered, open rate, click rate, bounce, unsubscribe | S6-19 |
| Live progress | Recipients processed vs total during send | S6-19 |
| Contact timeline | All marketing emails, opens, clicks on profile | S6-20 |
| Export | CSV of campaign results | S6-5 (contact export pattern) |

---

## 7. Should-have (stretch)

| Requirement | Story |
|---|---|
| A/B subject line test | S6-22 |
| Send-time window (recipient timezone) | S6-23 |

---

## Definition of Done (sign-off checklist)

### Marketer journey
- [ ] Create segment from CRM filters; preview count
- [ ] Build HTML template with merge tags; send test to self
- [ ] Launch broadcast to segment; schedule for later works
- [ ] View campaign report with open/click rates within 24 h of send

### Automation journey
- [ ] Publish welcome drip: contact created → email day 0 → wait 3 days → follow-up
- [ ] Branch: if opened → send offer; if not → send reminder
- [ ] Conversation resolved trigger enrolls contact in post-chat survey email

### Contact journey
- [ ] Unsubscribe link in email suppresses future marketing
- [ ] Resubscribe only via explicit opt-in (or double opt-in if enabled)
- [ ] Bounced address suppressed automatically

### Administrator journey
- [ ] Sending domain verified in Resend; from-address matches brand
- [ ] Suppression list visible; can manually add email
- [ ] Webhook events update delivery status within 5 min

---

## Explicitly out of scope (Sprint 6)

| Item | Where |
|---|---|
| Inbound email support inbox | Sprint 7 |
| WhatsApp / SMS campaigns | Sprint 14 |
| Chat widget proactive drip | Sprint 14 |
| Full marketing automation rule engine (non-email actions) | Sprint 10 |
| Landing page builder | Backlog |
| SMS marketing | Sprint 14 / backlog |
| Advanced lead scoring | Backlog |

---

## Comparison to market

| Capability | Mailchimp / Brevo | FlowChat target (Sprint 6) |
|---|---|---|
| Contact CRM | ✅ | S6-1 – S6-7 |
| Segments | ✅ | S6-11 |
| Email templates + merge tags | ✅ | S6-12 |
| Broadcast campaigns | ✅ | S6-14 |
| Automation workflows | ✅ | S6-15, S6-16 |
| Unsubscribe + compliance | ✅ | S6-17 |
| Open/click tracking | ✅ | S6-18, S6-19 |
| A/B testing | ✅ | S6-22 (Should) |
| Support inbox email | ✅ (different product) | Sprint 7 |

---

*Last updated: 2026-06-05 · Sprint 6 module · Resend provider · BullMQ dispatch*
