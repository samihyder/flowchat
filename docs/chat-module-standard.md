# FlowChat — Industry Standard Chat Module

> **Purpose:** Define what “chat module complete” means before CRM work (Sprint 6) begins.  
> **Scope:** Web live chat only — omnichannel (email, WhatsApp, etc.) is Phase 3+.  
> **Reference:** Stories are tracked in [sprints.md](sprints.md) Sprint 4–5.

---

## Gate rule

**Sprint 6 (CRM) is blocked** until every **Must** item in this document is implemented and verified in staging.

---

## 1. Conversation lifecycle (Sprint 4)

| Requirement | Standard | Story |
|---|---|---|
| Assign / reassign agent | Manual + default assignee on inbox | S4-1 |
| Team assignment & round-robin | Auto-route to team members | S4-1 |
| Status workflow | open, pending, resolved, snoozed | S4-2 |
| Priority | urgent → low, filterable | S4-3 |
| Labels | Multi-label, filterable | S4-4 |
| Snooze | Scheduled wake-up, auto-reopen | S4-5 |
| Filters | Status, assignee, team, inbox, label, priority, date | S4-6 |
| Typing indicator | Both directions, real-time | S4-7 |
| Mine / unassigned views | Agent queue filters | S4-8 |

---

## 2. Notifications & availability (Sprint 4)

| Requirement | Standard | Story |
|---|---|---|
| New message alert | Tab badge + sound; mute option | S4-9 |
| Missed chat alert | Email/in-app if no reply within N minutes | S4-10 ✅ |
| Business hours | Per-inbox schedule + timezone | S4-11 ✅ |
| Offline mode | Honest widget state + offline message / capture | S4-12 ✅ |
| Visitor on-site alert | Optional siren (implemented) | — |
| Analytics exclusions | IP + machine ID omitted from metrics | S4-19 ✅ |

---

## 3. Security & compliance (Sprint 4)

| Requirement | Standard | Story |
|---|---|---|
| Domain allowlist | Widget/API only from approved origins | S4-13 |
| Rate limiting | visit, session, message endpoints | S4-14 |
| GDPR baseline | Consent, privacy link, retention, export/delete | S4-15 |
| Block visitor | By IP or contact | S4-16 |

---

## 4. Multi-tenant access (Sprint 4)

| Requirement | Standard | Story |
|---|---|---|
| Invite-only agents | No public agent self-signup | ✅ shipped |
| Admin approval | pending → active membership | ✅ shipped |
| Inbox assignment UI | Pick websites on approve | S4-17 ✅ |
| Invite email delivery | Resend (or equivalent), not manual link only | S4-17 ✅ |
| Work-email workspace sign-up | Block consumer domains | ✅ shipped |
| Workspace domain allowlist | Optional `@company.com` only | S4-18 ✅ |
| Analytics IP / machine exclusions | Office IP & browser machine ID omitted from stats | S4-19 ✅ |

---

## 5. Rich messaging (Sprint 5)

| Requirement | Standard | Story |
|---|---|---|
| Attachments | Images/files via R2, preview in thread | S5-1 |
| Private notes | Internal only, distinct styling | S5-2 |
| Edit / delete message | Time-limited edit, soft delete | S5-3 |
| Read receipts | Delivered/read state | S5-4 |
| Canned responses | Snippets + `/shortcut` | S5-6 |
| @mentions in notes | Notify mentioned agent | S5-7 |
| Draft persistence | Per-conversation draft | S5-5 |
| Bulk actions | Multi-select operations | S5-10 |
| Merge / transcript | Merge threads; export transcript | S5-8, S5-9 |

---

## 6. Agent & visitor UX (Sprint 5)

| Requirement | Standard | Story |
|---|---|---|
| Visitor context sidebar | URL, referrer, geo, device, history | S5-11 |
| Collision indicator | Another agent viewing thread | S5-12 |
| Custom pre-chat fields | Configurable per inbox | S5-13 |
| Proactive triggers | Time/URL rules on widget | S5-14 |
| Message pagination | Long threads load incrementally | S5-15 |
| Idempotent send | No duplicate messages on retry | S5-15 |
| Email fallback | Offline / unanswered escalation | S5-16 |

---

## 7. Quality, search & integrations (Sprint 5)

| Requirement | Standard | Story |
|---|---|---|
| Post-chat CSAT | Stars + comment after resolve | S5-17 |
| Support KPIs | FRT, resolution time, missed rate | S5-18 |
| Conversation search | Contact, email, message text | S5-19 |
| Webhooks | created / message / resolved + HMAC | S5-20 |
| Audit log | Agent actions on conversations & settings | S5-21 |

---

## 8. Real-time baseline (Sprint 3 — already shipped)

| Requirement | Status |
|---|---|
| Widget embed + pre-chat | ✅ |
| WebSocket + Redis pub/sub | ✅ |
| Polling fallback + optimistic send | ✅ |
| Session restore on page reload | ✅ |
| Per-inbox analytics (visits) | ✅ |

---

## Definition of Done (sign-off checklist)

Use this before starting Sprint 6:

### Visitor journey
- [ ] Visitor can start chat on an allowlisted domain only
- [ ] Pre-chat form supports custom fields + consent where required
- [ ] Widget shows correct online/offline state per business hours
- [ ] Messages deliver in real time (&lt; 2 s p95 with WS; &lt; 5 s with polling fallback)
- [ ] Returning visitor sees prior conversation when session is restored
- [ ] CSAT prompt appears after agent resolves chat

### Agent journey
- [ ] Agent hears/sees alert on new visitor message
- [ ] Agent can find conversations via search and filters (mine, unassigned, inbox, label)
- [ ] Agent can assign, snooze, label, attach files, use canned replies, add private notes
- [ ] Agent sees visitor context sidebar while replying
- [ ] Agent sees when another agent is viewing the same conversation
- [ ] Unread counts sync when conversation is opened

### Administrator journey
- [ ] Admin invites agent by email; agent accepts and waits for approval
- [ ] Admin approves agent and assigns allowed websites/inboxes
- [ ] Admin configures business hours, domain allowlist, CSAT toggle per inbox
- [ ] Admin views FRT, resolution time, CSAT, and visit metrics per website
- [ ] Admin can exclude office IPs and test machines from analytics (stats only; chat unaffected)

### Platform & trust
- [ ] Public endpoints rate-limited; abuse blocked without breaking legit traffic
- [ ] GDPR export/delete works for a test visitor
- [ ] Webhooks fire with valid signature to a test endpoint
- [ ] Audit log records assign, resolve, approve, and settings changes

### Explicitly out of scope (Phase 3+)
- Email / WhatsApp / social channels  
- CRM contact list, import, companies (Sprint 6+)  
- Automation rules engine  
- AI reply suggestions / chatbot  
- SAML SSO (Enterprise phase)  
- Mobile agent app  

---

## Comparison to market

| Capability | Crisp / LiveChat / Zendesk Chat | FlowChat target (post Sprint 5) |
|---|---|---|
| Live widget | ✅ | ✅ |
| Business hours | ✅ | S4-11 |
| Domain lock | ✅ | S4-13 |
| CSAT | ✅ | S5-17 |
| Canned replies | ✅ | S5-6 |
| Private notes | ✅ | S5-2 |
| Attachments | ✅ | S5-1 |
| Webhooks | ✅ | S5-20 |
| Search | ✅ | S5-19 |
| FRT reporting | ✅ | S5-18 |
| Omnichannel | ✅ | Phase 3 (Sprint 7+) |
| AI bot | ✅ | Phase 4 (Sprint 11+) |

---

*Last updated: 2026-06-05*
