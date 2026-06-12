# FlowChat — Feature Specification

> Reference document for building FlowChat. Derived from the Chatwoot feature set with modernised naming and architecture intent.

---

## 1. Channels & Inboxes

### Supported Channels
| Channel | Notes |
|---|---|
| Web Live Chat | Embeddable JS widget, pre-chat form, custom fields |
| Email | Inbound/outbound, threading, quoted replies |
| WhatsApp (Cloud API) | Templates, media, read receipts |
| WhatsApp (Twilio) | Fallback / legacy business accounts |
| Facebook Messenger | Page-level inbox |
| Instagram DM | Business account required |
| Telegram | Bot token integration |
| SMS (Twilio) | E.164 format, two-way |
| TikTok DM | Business account |
| LINE | Japan / SE Asia markets |
| API Channel | Any custom source via REST webhook |

### Inbox Config (per channel)
- Display name, avatar, greeting message
- Out-of-hours auto-reply
- CSAT survey toggle
- Working hours schedule (per day, per timezone)
- Auto-assignment mode: round-robin | capacity-based | off
- Reply window enforcement (WhatsApp 24 h, etc.)
- Agent membership & capacity limits

---

## 2. Conversations

> **Chat module gate:** Web live chat must meet the [Industry Standard Chat Module](chat-module-standard.md) checklist (Sprints 4–5) before CRM features (Sprint 6) begin.

### Industry standard baseline (Sprints 4–5, pre-CRM)

**Lifecycle & ops (Sprint 4)**
- Full status workflow, priority, labels, snooze, filters, typing indicator
- Agent notifications (new message + missed chat), business hours, offline mode
- Widget domain allowlist, API rate limits, GDPR baseline, block visitor
- Tenant access: inbox assignment on approve, invite email delivery

**Messaging & quality (Sprint 5)**
- Attachments, private notes, canned responses, read receipts, @mentions
- Visitor context sidebar, agent collision indicator, custom pre-chat fields
- CSAT, FRT/resolution KPIs, conversation search, webhooks, audit log
- Message pagination, idempotent send, proactive triggers (should), email fallback (should)

See [sprints.md](sprints.md) for full story breakdown.

### Lifecycle & Status
- `open` → `pending` → `resolved` → `snoozed`
- Priority tiers: `urgent` | `high` | `medium` | `low`
- Auto-resolve after configurable idle duration

### Core Operations
- Agent & team assignment (single or bulk)
- Snooze with custom wake-up timestamp
- Mute / unmute
- Participant roster (multiple agents observe/contribute)
- Labels / tags (multi-value)
- Merge two conversations
- Export transcript (plain text / email)
- Draft message persistence

### Messaging
- Text, rich text, emoji, attachments (up to 15 per message)
- Private notes (internal, not sent to customer)
- Message edit & delete
- Read receipts & delivery status
- Typing indicator (real-time)
- Message templates (WhatsApp / SMS)
- AI-drafted reply suggestions
- One-click message translate
- Voice messages (record & send)
- Structured content: cards, forms, article embeds, CSAT survey widget

### Metadata Captured
- Browser language, country code, city
- Referrer URL
- Contact company, custom attributes
- Campaign source

---

## 3. Contacts & CRM

### Contact Model
- Name, email (unique per account), phone (E.164)
- Type: `visitor` | `lead` | `customer`
- Avatar, location, country, city
- Blocked flag
- Custom attributes (flexible schema)
- Last activity timestamp

### Contact Operations
- Full-text search (name, email, phone, external ID)
- Merge duplicates (bulk or single)
- Import / export CSV
- Conversation history view
- Notes
- Label management
- Company association

### Email marketing automation (Sprint 6)

> Full checklist: [email-marketing-standard.md](email-marketing-standard.md). Outbound marketing on CRM contacts — separate from the email **support inbox** (Sprint 7).

- **Audience:** Static lists, dynamic segments, subscription status, suppression list
- **Templates:** HTML + plain-text, merge tags, test send, verified sending domain (Resend)
- **Broadcasts:** One-time campaigns to a segment; schedule or send now; BullMQ queue
- **Automation:** Workflow builder — triggers (contact created, label added, conversation resolved) → send email, wait, branch on open/click, drip sequences
- **Compliance:** One-click unsubscribe, `List-Unsubscribe` header, bounce/complaint auto-suppress, optional double opt-in
- **Analytics:** Campaign open/click/bounce rates; per-contact email timeline on profile

### Companies (CRM)
- Name, domain, description
- Favicon auto-fetch from domain
- Custom attributes
- Contact → Company M:N relationship
- Company-level conversation view

---

## 4. Agents & Teams

### Agent Management
- Roles: `administrator` | `agent` | custom roles
- Availability: `online` | `busy` | `offline`
- Auto-offline after inactivity window
- Invite via email
- Capacity policy assignment

### Teams
- Create teams, assign agents
- Team-level auto-assignment
- Team conversation filter
- Team analytics

### Custom Roles (Premium)
- Granular permissions:
  - Conversations: all | unassigned | participating
  - Contacts: view/edit/delete
  - Reports: view
  - Knowledge base: manage

### Capacity Policies (Premium)
- Per-agent conversation limits
- Per-inbox caps
- Exclusion rules (e.g. VIP labels bypass cap)

---

## 5. Automation

### Rules Engine
- **Triggers:** conversation created, message received, status changed, assigned, unassigned, conversation opened, CSAT received
- **Conditions:** content match, email pattern, country, status, message type, browser language, assignee, team, label, priority, custom attribute
- **Operators:** AND / OR with nested groups
- **Actions:**
  - Send auto-reply
  - Add / remove label
  - Assign to agent / team
  - Change status (resolve, open, pending, snooze)
  - Set priority
  - Mute conversation
  - Fire webhook
  - Add private note
  - Send email transcript
  - Send attachment

### Macros
- Saved action sequences (public or personal)
- Run manually or via automation
- Actions: all automation actions + custom message templates
- Up to 15 attachments per macro

### Agent Bots
- Webhook-based custom bots
- Assigned per inbox
- Bot avatar & access token
- Status: active, inactive
- Handoff trigger → assigns to human queue

---

## 6. AI Assistant (Captain)

### Setup
- Multiple AI assistants per account
- Configurable model temperature and provider
- Response guidelines & guardrails (system prompt)
- Inbox → assistant assignment

### Knowledge Sources
- Help center article sync
- External URL ingestion (auto-sync)
- PDF upload with content fingerprinting

### Built-in Tools
| Tool | Action |
|---|---|
| FAQ Lookup | Search knowledge base |
| Handoff | Transfer to human agent |
| Add Label | Tag conversation |
| Set Priority | Change urgency |
| Add Private Note | Internal message |
| Resolve | Close conversation |
| Status Change | Open / pending / snooze |

### Custom AI Tools (Premium)
- HTTP endpoint definition (GET / POST)
- JSON parameter schema
- Auth: none | bearer | basic | API key
- Request / response templating
- Up to 15 tools per account

### Agent Copilot
- Side panel AI thread per conversation
- Multi-turn suggestions with full conversation context
- Reply suggestion, summarise, rewrite, follow-up generator
- Label suggestions

---

## 7. Knowledge Base / Help Center

### Portal
- Multiple portals per account
- Custom domain with SSL
- Custom color scheme, logo, header text, page title
- Archivable

### Articles
- Statuses: `draft` | `published` | `archived`
- Multilingual (locale per article)
- Full-text search (GIN index)
- View counter
- Related articles
- Position / ordering
- Meta fields (SEO)

### Categories
- Hierarchical categories + folders
- Per-locale category names

### Agent Integration
- Insert article in reply
- Inline FAQ search from conversation panel

---

## 8. Campaigns

### One-off Campaigns
- Target: SMS or WhatsApp contacts
- Template selection & variable mapping
- Schedule or send immediately
- Status tracking per recipient

### Ongoing (Drip) Campaigns
- Web widget trigger (time on page, URL match)
- Message delay configuration
- Enable / disable per inbox

---

## 9. Reports & Analytics

### Dashboards
- Conversation volume (daily / weekly / monthly)
- Agent performance (CSAT, FRT, resolution time)
- Team performance
- Inbox performance
- Label analytics

### Metrics Tracked
- First response time (FRT)
- Resolution time
- Conversations opened / resolved
- Message count
- CSAT score (rating + feedback text)
- SLA adherence (Premium)

### Exports
- Conversation transcripts
- CSAT responses CSV
- Applied SLA metrics CSV
- Contact export CSV

### SLA Policies (Premium)
- First response threshold
- Next response threshold
- Resolution threshold
- Business hours mode
- SLA breach notifications

---

## 10. Notifications

### Channels
- In-app notification center
- Email notifications
- Browser push (FCM)

### Triggers
- New conversation assigned to me
- New message in my conversations
- Mention (`@agent`)
- SLA first response missed
- SLA resolution missed
- Conversation reopened

### Controls
- Per-agent enable / disable per type
- Notification snooze
- Bulk mark-as-read
- Unread count badge

---

## 11. Auth & Security

### Authentication
- Email + password
- Google OAuth 2.0
- SAML 2.0 SSO (Premium)
- Remember me
- Password reset via email

### Two-Factor Authentication
- TOTP authenticator app
- Backup codes (hashed)
- Per-account enforce 2FA policy

### Access Control
- JWT + refresh token (API)
- API access tokens with scopes
- Webhook signing secrets
- Platform app tokens

### Audit Logs (Premium)
- Every create / update / delete action
- Diff of changed fields (JSON)
- User, IP, timestamp
- Request correlation ID

---

## 12. Integrations & Webhooks

### Native Integrations
- Google (Gmail OAuth)
- Microsoft (Outlook / Exchange OAuth)
- Facebook / Instagram
- Twitter / X
- TikTok
- Notion
- DialogFlow

### Webhooks
- Account-level and inbox-level
- Event subscriptions: conversation CRUD, contact CRUD, message CRUD, typing, inbox, web widget
- Delivery retries
- Signing secret

### Dashboard Apps
- Embed any URL as a side panel per conversation
- Pass conversation + contact context via postMessage

---

## 13. Platform & API

### REST API (v1 / v2)
- Full CRUD for all entities
- Conversation filtering & search
- Bulk operations
- Pagination (cursor-based)
- Rate limiting

### Public Widget API
- JavaScript SDK for web widget
- Pre-population of contact info
- Custom attribute injection
- Event callbacks

### Platform App API
- OAuth-style platform app registration
- Manage accounts, contacts, conversations on behalf of users

---

## 14. PWA / Mobile

- Service worker + offline message queue
- Install-as-app (Add to Home Screen)
- Responsive layout (mobile-first breakpoints)
- Touch-optimised conversation list & composer
- FCM push notifications (mobile web + native wrapper)

---

## 15. Configuration & Administration

### Account Settings
- Account name, timezone, locale
- Feature flags (enable / disable modules)
- Auto-resolve idle duration
- CSAT survey message
- Custom attributes definition (conversation + contact)
- Installation branding (Premium: hide FlowChat badge)

### Super Admin
- Account management (create, suspend, seed data)
- Feature flag overrides per account
- Installation config
- Audit log viewer

---

*Last updated: 2026-06-01 — reflects Chatwoot OSS + Enterprise feature set mapped to FlowChat.*
