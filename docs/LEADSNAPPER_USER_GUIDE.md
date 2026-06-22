# LeadSnapper — User Guide for Sales

**Who this is for:** Sales reps, business development, and anyone finding new B2B leads on Google.

**What LeadSnapper does:** It is a Chrome extension that helps you find local businesses on Google, score them as Hot / Warm / Cold, enrich contact details (phone, email, LinkedIn, owner mobile), and send qualified leads into **FlowChat CRM**.

---

## Before you start

You need:

1. **Google Chrome** on your computer  
2. **LeadSnapper extension** installed (your admin will give you the folder or Chrome Web Store link)  
3. **FlowChat account** — your admin sets up the connection once; you use the **Export** tab to sync leads  

**Sign in to FlowChat:**  
[https://www.digitalbrandcast.com/FlowChat/sign-in](https://www.digitalbrandcast.com/FlowChat/sign-in)

---

## Opening LeadSnapper

1. Click the **LeadSnapper** icon in the Chrome toolbar (top right).  
2. The side panel opens with tabs along the top: **Find → Results → Pipeline → Export → Settings**.

---

## Your daily workflow (4 steps)

| Step | Tab | What you do |
|------|-----|-------------|
| 1 | **Find** | Pick a preset or type a keyword (e.g. “restaurants London”) |
| 2 | **Results** | Open Google or Maps, click **Scan**, review businesses |
| 3 | **Pipeline** | Add good leads, enrich phones/LinkedIn, set status |
| 4 | **Export** | **Sync qualified (Hot + Warm)** to FlowChat CRM |

---

## Step 1 — Find (search setup)

### Quick presets

On the **Find** tab, tap a **Quick Preset** (e.g. restaurants, retail, professional services). Each preset sets:

- **Market** — UK or US  
- **City / area**  
- **Brand** — which company you are selling for (e.g. Mutex Systems or NexusCorp)  
- **Services** you want to pitch  

### Custom search

1. Type your own **keyword** in the search box.  
2. Set **city** and **country** if needed.  
3. Click **Open in Google** or **Open in Maps** to start browsing results.

**Tip:** Google Maps and the Google “Places” tab usually give the best scan results.

---

## Step 2 — Results (scan & score)

1. With Google or Maps open, click **Scan** (top of the panel or on the Results tab).  
2. LeadSnapper lists businesses it found on that page.  
3. Click a business to **expand** it and see details.

### Lead priority (what the colours mean)

| Priority | Meaning |
|----------|---------|
| **Hot** | Strong fit — prioritise these for outreach |
| **Warm** | Good prospect — worth following up |
| **Cold** | Weak fit or missing data — usually skip for CRM sync |

The score updates as you enrich the lead (website data, company register, mobile lookup).

### Useful actions on Results

- **Find owner mobile** — tries to get a direct mobile for the decision-maker (UK/US providers)  
- **Add to Pipeline** — moves the lead into your working list  
- **Select Hot** — quickly tick all Hot leads  
- **Load more** — after scrolling Google, scan again for new businesses (existing ones are not duplicated)

If scan finds nothing: switch to **Google Maps** or the **Places** tab on Google Search, then scan again.

---

## Step 3 — Pipeline (your working list)

The **Pipeline** tab is your session list for today.

For each lead you can:

- Edit **business name**, **phone**, **email**, **notes**  
- Set **lead status** (e.g. New, Contacted, Qualified)  
- See if it already synced to CRM (green **CRM** badge when done)  
- **Delete** leads you no longer want  

**Enrich from website** — if a lead has a website but thin details, use enrich to pull emails, social links, and tech signals from their site.

---

## Step 4 — Export (Excel or FlowChat CRM)

### Export to Excel

Use **Export to Excel** if you need a spreadsheet backup:

- Export all, selected, Hot only, Warm only, or by brand (Mutex / Nexus)

### Sync to FlowChat CRM (main handoff to sales ops)

1. Go to **Export** tab.  
2. Click **Sync qualified (Hot + Warm)** — this sends your best leads to FlowChat.  
3. You will see a summary: how many were **created**, **updated**, or **skipped**.  
4. In Pipeline, synced leads show a **CRM** badge.

You can also **Sync selected** or **Sync all** if your manager asks.

**Important:** Only **Hot** and **Warm** leads are sent when you use “Sync qualified”. Cold leads stay in LeadSnapper only.

---

## Settings (one-time setup)

Open the **Settings** tab. Your admin may do most of this; sales reps usually only check **Flow CRM sync**.

### Brands

Pre-loaded brands (e.g. Mutex Systems, NexusCorp) include which **services** you sell. Pick the right brand on the **Find** tab before scanning.

### Keywords & presets

Managers can add **keyword groups** and **presets** so the team searches consistently.

### Local SMB mode (recommended for shops & restaurants)

When **ON** (default):

- **UK leads:** Companies House → Openmart → Cognism  
- **US leads:** Openmart → Lusha  

This is the normal mode for Google Maps / local business prospecting.

### API keys (enrichment)

Your admin adds keys for:

- **Companies House** (UK, free) — company number and directors  
- **Openmart**, **Cognism** (UK), **Lusha** (US) — mobiles and emails  

Without keys, you can still scan and score, but **Find owner mobile** may not work.

### Flow CRM sync (connect to FlowChat)

| Field | What to enter |
|-------|----------------|
| **Enable Flow CRM sync** | ON |
| **FlowChat API base URL** | `https://www.digitalbrandcast.com/FlowChat/api` |
| **API key** | From FlowChat → **Settings → Integrations** (starts with `fc_live_…`) |

When configured, the green banner says **“Ready to sync from Export tab”**.

**Ask your admin** for the API key — it is shown only once when created.

---

## Connecting LeadSnapper ↔ FlowChat (quick checklist)

**Admin does this in FlowChat (once):**

1. **Settings → Integrations** → Create API key named “LeadSnapper”  
2. **Settings → CRM** → Turn on **LeadSnapper → CRM sync**  
3. Choose **Hot + Warm** as minimum priority  
4. Click **Save & provision contact fields**  

**You do this in LeadSnapper:**

1. **Settings** → paste API URL and key → turn on **Flow CRM sync**  
2. **Export** → **Sync qualified (Hot + Warm)**  

**You confirm in FlowChat:**

1. Open **Dashboard → Contacts**  
2. New leads appear with business name, phones, LinkedIn, lead score, and priority  

---

## Tips for sales reps

- **Start with presets** — faster than typing keywords from scratch.  
- **Scan Maps, not blogs** — LeadSnapper targets real businesses with a Google listing.  
- **Enrich before you sync** — owner mobile and LinkedIn make follow-up easier.  
- **Sync at end of session** — keeps FlowChat CRM up to date for the team.  
- **Check FlowChat Contacts** — that is the single source of truth after sync.  
- **Do not share your API key** — treat it like a password.

---

## Common issues (plain English)

| Problem | What to try |
|---------|-------------|
| “Configure Flow CRM in Settings” | Add API URL + key; turn on sync in both LeadSnapper and FlowChat CRM settings |
| Sync says “skipped” | Lead may be Cold, duplicate, or below FlowChat’s minimum priority |
| Scan finds 0 businesses | Use Google Maps or Places tab; refresh the page; scan again |
| Find owner mobile fails | Ask admin to add enrichment API keys in Settings |
| Lead already in pipeline | LeadSnapper detected a duplicate — update the existing one instead |
| CRM badge not showing | Sync again from Export; check internet; confirm API key is still valid |

---

## Where to go next

After syncing leads to FlowChat:

- **Call or email** from details on the **Contact** profile  
- **Label** contacts (e.g. Hot Lead, Follow-up) in FlowChat  
- **Start a chat** if they visit your website (FlowChat widget)  
- **Email campaigns** — marketing team uses segments in FlowChat (see FlowChat User Guide)

---

*For technical setup (installing the extension, DNS, deployments), see the internal IT guide. This document is for day-to-day sales use.*
