# FlowChat — User Guide for Sales & Support

**Who this is for:** Sales reps, support agents, and team leads using live chat and CRM day to day.

**What FlowChat does:** One place to **chat with website visitors**, **manage contacts (CRM)**, and **run simple email follow-ups** — with leads from **LeadSnapper** flowing in automatically.

**Sign in:**  
[https://www.digitalbrandcast.com/FlowChat/sign-in](https://www.digitalbrandcast.com/FlowChat/sign-in)

---

## What you will use most

| Area | Where in the app | You use it to… |
|------|------------------|----------------|
| Inbox | **Dashboard** (home) | Reply to live chats from your website |
| Contacts | **Dashboard → Contacts** | See leads from LeadSnapper and chat visitors |
| Settings | Gear icon → **Settings** | Widget, labels, canned replies (admins set up) |
| Marketing | **Dashboard → Marketing** | Email campaigns (if your role includes this) |

---

## Getting started

### Sign in

1. Open the sign-in link above.  
2. Enter your **email** and **password** (your admin invites you).  
3. You land on the **Dashboard** — your conversation inbox.

### Set your availability

Bottom of the left sidebar:

| Status | Meaning |
|--------|---------|
| **Online** | You receive new chats and assignments |
| **Busy** | You are working but may get fewer auto-assignments |
| **Offline** | You do not receive new chats |

**Tip:** Stay **Online** during business hours so website visitors get a fast reply.

---

## Live chat inbox (Dashboard)

### Conversation lists

Left sidebar under **Conversations**:

- **All conversations** — everything in the workspace  
- **Mine** — assigned to you  
- **Unassigned** — needs someone to pick up (red badge = waiting)  

You can also filter by **Inbox** (e.g. “Website widget”) or **Team**.

### Replying to a visitor

1. Click a conversation in the list.  
2. Type your message at the bottom and press **Send**.  
3. Use **/** to insert a **canned response** (shortcuts your admin created).  

### Organising conversations

On each conversation you can:

- **Assign** to yourself or a teammate  
- Add **labels** (e.g. Sales, Hot, Follow-up)  
- Set **priority** (e.g. Urgent for hot inbound leads)  
- Change **status**: Open → Pending → Resolved  
- **Snooze** — hide until a reminder time (good for “call back Tuesday”)  

### Visitor details

The right panel shows:

- Name, email, company (if they filled the pre-chat form)  
- **Country / city** (when available)  
- Link to **Contact** record in CRM  

When you resolve a chat, the visitor stays in **Contacts** for future outreach.

---

## Contacts (CRM)

**Dashboard → Contacts**

This is where **LeadSnapper leads** land after sync, plus contacts from chats and imports.

### Finding someone

- **Search** by name, email, phone, or company  
- **Filter** by labels or custom fields (e.g. Hot priority, UK market)

### Contact profile

Open a contact to see:

- Phone numbers (business and owner mobile from LeadSnapper)  
- Email and website  
- LinkedIn and social links  
- **Lead score** and **priority** (Hot / Warm)  
- **Notes** — add your call notes here  
- **Conversation history** and **email history** (if marketing is enabled)

### Common actions

| Action | How |
|--------|-----|
| Add a note | Contact profile → Notes → Save |
| Add a label | Contact profile or list bulk actions |
| Merge duplicates | Contact profile → Merge (admin) |
| Export list | Contacts → Export (if your admin enabled it) |

---

## LeadSnapper connection (CRM sync)

LeadSnapper is the Chrome tool your team uses on Google. **Qualified leads sync into FlowChat Contacts** — you do not type them in by hand.

### How it works (simple)

```
Google / Maps  →  LeadSnapper  →  FlowChat Contacts  →  You call / email / chat
```

1. Rep finds businesses in **LeadSnapper** and scores them Hot or Warm.  
2. Rep clicks **Sync qualified (Hot + Warm)** on the Export tab.  
3. Contacts appear in **FlowChat → Contacts** with enrichment (phones, LinkedIn, etc.).  
4. You work the lead from the contact profile.

### What sales sees after sync

New contacts typically include:

- Business name and website  
- Email and phone  
- Owner name and mobile (when enrichment found them)  
- LinkedIn (company and decision-maker)  
- Lead **score** and **priority**  
- Market (UK / US) and enrichment source  

Duplicates are merged when the same business is synced again (same email or website).

### If leads are missing

Check with your admin that:

1. **Settings → CRM** → **LeadSnapper sync** is ON  
2. Minimum priority is **Hot + Warm** (not “Hot only” if the lead was Warm)  
3. LeadSnapper **Settings** has the correct API URL and key  
4. The rep actually clicked **Sync** on the Export tab  

---

## Settings overview

Open **Settings** from the sidebar. Most items are **admin-only**; sales uses the results daily.

### General (admin)

| Page | Purpose |
|------|---------|
| **Account** | Company name, timezone (e.g. UK), logo |
| **Agents** | Invite teammates, set roles |
| **Teams** | Groups like “UK Sales” for routing |
| **Security** | Two-factor login for admins |

### Channels

| Page | Purpose |
|------|---------|
| **Inboxes** | Website chat widget — colours, greeting, embed code for your site |

**Sales tip:** If the widget is not on the website yet, ask admin for the embed code under **Settings → Inboxes**.

### Automation (admin + daily use)

| Page | Purpose |
|------|---------|
| **Labels** | Tags for conversations and contacts (Hot Lead, Mutex, UK, etc.) |
| **Canned responses** | Type `/` in chat to insert saved replies |
| **Auto messages** | Welcome message when someone opens chat (online / offline) |

### Integrations (admin)

| Page | Purpose |
|------|---------|
| **Integrations** | API keys — including the key for **LeadSnapper** |
| **Connected services** | Your company’s email provider and optional AI for the widget |

### CRM (admin)

| Page | Purpose |
|------|---------|
| **CRM settings** | Import/export rules, **LeadSnapper integration**, custom contact fields |
| **Email marketing** | Sender name, address, compliance footer |

---

## LeadSnapper setup (for admins — share with IT once)

Do this **once** before sales syncs leads.

### 1. Create API key

1. **Settings → Integrations**  
2. **Create API key**  
   - Name: `LeadSnapper`  
   - Permission: contacts write  
3. **Copy the key** (`fc_live_…`) — it is shown only once.  
4. Give the key to reps for LeadSnapper **Settings → Flow CRM sync**.

### 2. Enable CRM sync

1. **Settings → CRM**  
2. Turn on **Enable LeadSnapper → CRM sync**  
3. **Minimum priority:** Hot + Warm (recommended)  
4. Click **Save & provision contact fields**  

This creates the extra fields on contacts (lead score, social links, enrichment data, etc.).

### 3. Configure LeadSnapper extension

In LeadSnapper **Settings**:

| Field | Value |
|-------|--------|
| Flow CRM sync | ON |
| API base URL | `https://www.digitalbrandcast.com/FlowChat/api` |
| API key | The `fc_live_…` key from step 1 |

Reps sync from **LeadSnapper → Export → Sync qualified (Hot + Warm)**.

### 4. Verify

1. Sync one test lead from LeadSnapper.  
2. Open **Dashboard → Contacts** — the business should appear within a few seconds.  
3. Open the contact — check phone, priority, and LinkedIn fields.

---

## Website chat widget (what visitors see)

Visitors on your website see a **chat bubble**. When they click it:

1. They may see a short form (name / email).  
2. **Auto messages** greet them (different text if your team is online vs offline).  
3. Messages appear in your **Dashboard** inbox in real time.

**Your job:** Reply quickly when **Unassigned** has a red badge — that is a new visitor waiting.

Optional: If **AI replies** are turned on by admin (Connected services), the widget may answer simple questions before you join. You can still take over the conversation anytime.

---

## Marketing (if you send email)

**Dashboard → Marketing**

| Section | Use |
|---------|-----|
| **Segments** | Groups of contacts (e.g. all Hot leads) |
| **Templates** | Email designs with `{{first_name}}` personalization |
| **Campaigns** | Send one email blast to a segment |
| **Workflows** | Automated follow-ups (e.g. welcome email after new contact) |

Compliance: contacts who **unsubscribe** are blocked from future sends automatically.

---

## Analytics

**Dashboard → Analytics**

High-level stats: conversation volume, response times, and trends. Useful for weekly team reviews — not needed for every reply.

---

## Daily checklist for sales reps

**Morning**

- [ ] Set status to **Online**  
- [ ] Check **Unassigned** conversations  
- [ ] Review **Contacts** for new LeadSnapper syncs overnight  

**During the day**

- [ ] Reply to chats within your team’s target time  
- [ ] Add **notes** and **labels** after calls  
- [ ] Resolve chats when done; snooze follow-ups with a date  

**After prospecting (LeadSnapper)**

- [ ] **Sync qualified (Hot + Warm)** to FlowChat  
- [ ] Open new contacts in FlowChat and schedule outreach  

**End of day**

- [ ] Set status to **Offline** if you are done  
- [ ] Leave notes on open contacts for handover  

---

## Roles: who does what

| Task | Sales rep | Admin / manager |
|------|-----------|-----------------|
| Reply to chats | ✓ | ✓ |
| Work contacts & notes | ✓ | ✓ |
| Sync LeadSnapper | ✓ | ✓ |
| Create API key & CRM sync | | ✓ |
| Install widget on website | | ✓ |
| Invite agents & teams | | ✓ |
| Email campaigns & workflows | Optional | ✓ |
| Canned responses & labels | Use | Create |

---

## Common questions

**Where did my LeadSnapper lead go?**  
→ **Contacts**. Search the business name. If missing, confirm sync ran and priority was Hot or Warm.

**Can I edit a contact synced from LeadSnapper?**  
→ Yes. Your edits in FlowChat stay; syncing again may update fields from LeadSnapper.

**Someone chatted on the website — where is the contact?**  
→ Open the conversation → link to contact, or find them under **Contacts** by email.

**I do not see Marketing**  
→ Your role may be chat-only; ask admin.

**Widget not showing on site**  
→ Admin must add embed code and allow your domain in **Settings → Inboxes**.

---

## Related guide

For step-by-step use of the Chrome extension (Find → Results → Pipeline → Export), see **LeadSnapper User Guide** (`LEADSNAPPER_USER_GUIDE.md`).

---

*This guide focuses on everyday use. Technical deployment and DNS are handled by your admin team.*
