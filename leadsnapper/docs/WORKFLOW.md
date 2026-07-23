# LeadSnapper — Sales Workflow & Companies House

Last updated: June 2026

---

## Quick start (sales team)

| Step | Tab | Action |
|------|-----|--------|
| 1 | **Find** | Pick a preset → open Google Search or Maps → scroll until local businesses / map pack visible |
| 2 | **Find** | Click **Scan Current Page** (or **Scan** in header) |
| 3 | **Results** | Review leads → expand a row → **Owner** tab → **Find owner mobile** or **Test Companies House lookup** |
| 4 | **Results** | Select leads → **Add to Pipeline** |
| 5 | **Pipeline** | Update status, notes → **Export** |

**Install (once per laptop):** Load `extension/dist` in `chrome://extensions` → Developer mode → Load unpacked. Sales team does **not** run `npm run build`.

---

## What gets scanned

LeadSnapper captures **local businesses only** from:

- Google Maps result list
- Google Search **Places** tab (`tbm=lcl`)
- Google Search **local pack** / map sidebar (`a.hfpxzc`, `data-cid`, Maps place links)

It does **not** capture blogs, TripAdvisor, Yelp, listicles, or other organic website links.

**Scan behaviour**

- User clicks **Scan** or **Load more** — no auto-refresh while scrolling
- Re-scan **merges** new cards; existing enrichment is kept until you re-enrich
- Website + GMB enrichment runs in the background after scan

---

## Owner lookup modes

### Local SMB mode (default ON)

For restaurants, shops, and Maps leads.

| Market | Waterfall |
|--------|-----------|
| **UK** | **Companies House** → Openmart (owner + mobile) → Cognism (mobile fallback) |
| **US** | Openmart (owner + mobile) → Lusha (mobile fallback) |

PDL and Explorium are hidden unless you turn Local SMB mode **off** in Settings.

### CH test mode (Settings toggle)

**Test: Companies House only** — amber toggle.

- Skips Openmart, Cognism, and Lusha
- Runs **only** the four Companies House API endpoints
- Use to verify register data (company name, director, PSC, address) before going live

### When Companies House runs

CH is used only when **either**:

1. **CH test mode** is ON, or  
2. **Local SMB mode** is ON (UK waterfall step 2)

All four endpoints are auto-enabled in those modes (provider toggle is ignored).

---

## Companies House API

### One key, four endpoints

Register free at [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk/).

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `GET /search/companies?q={name}` | Find UK company number from business name |
| 2 | `GET /company/{number}/officers` | Registered **director** name + role |
| 3 | `GET /company/{number}/persons-with-significant-control` | **PSC** (beneficial owner) |
| 4 | `GET /company/{number}/registered-office-address` | Registered office address |

**Auth:** HTTP Basic — API key as username, blank password.

### Where the key lives

- **Sales build:** Pre-filled via built-in config (`extension/src/config/builtin-keys.ts`) — field shows as masked in Settings
- **Override:** Settings → **Local SMB API Keys** → **UK Companies House** → paste key → **Test**

**Test button** should return four lines:

```
Search:   ✓ {company} ({number})
Officers: ✓ {director} (director)
PSC:      ✓ {name}
Address:  ✓ {formatted address}
```

### Owner tab — auto-filled fields (after CH lookup)

| Field | Source |
|-------|--------|
| Registered company | CH search |
| Company no. | CH search |
| Status | CH search |
| Registered office | CH address endpoint |
| Director | CH officers |
| Director role | CH officers |
| PSC (beneficial owner) | CH PSC list |
| Primary owner | Director → PSC fallback |
| Mobile / email | Cognism (live UK waterfall only) |

All fields remain **editable** after auto-fill. Export CSV includes the new CH columns.

---

## Settings reference

**Settings → Local SMB API Keys**

| Step | Provider | Required for |
|------|----------|----------------|
| 1 | UK Companies House | UK company, director, PSC, address (**free**) |
| 2 | Openmart | Owner contacts from `find_people` (name, title, mobile, LinkedIn) |
| 3 | Cognism (UK) | Owner mobile if Openmart has no number |
| 3 | Lusha (US) | Owner mobile if Openmart has no number |

**Companies House endpoints** — toggles for search, officers, PSC, address (forced ON when test or Local SMB mode is active).

**Local SMB mode** — ON = waterfall only; OFF = advanced PDL/Explorium options.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No businesses on scan | Scroll to local pack / Places tab / open Google Maps → Scan again |
| CH “disabled in Settings” | Turn on **CH test mode** or **Local SMB mode** — CH auto-enables |
| CH “API key missing” | Reload extension after build; check Settings → UK Companies House → Test |
| CH test works, no mobile | Expected in test mode — turn off CH-only test and add Cognism for UK mobile |
| Openmart `batch_ready` error | Fixed — reload latest `dist` |
| `onOpenSettings` crash | Fixed — reload latest `dist` |

---

## Build (developers only)

```bash
cd extension
npm run build
```

Reload extension in `chrome://extensions`. Distribute `extension/dist/` to sales.

To export a saved Chrome key into built-in config (optional):

```bash
npm run export-ch-key
npm run build
```

---

## Recent changes (June 2026)

- Unified Google Search local scanner (`hfpxzc`, `data-cid`, Maps place links)
- Scan: Places/Maps only; stable merge; manual Scan / Load more
- Companies House: four endpoints in test mode + UK live waterfall
- Owner tab: editable auto-filled register fields
- Built-in CH API key for sales builds
- Local SMB mode default; CH test mode for register-only testing
- Settings: CH auto-enable when test/live mode on; API key sync fixes
- Export: Director Role, PSC, Registered Company, Registered Office, Company Status
