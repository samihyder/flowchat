# LeadSnapper — usage guide (FlowChat)

LeadSnapper is a **scrape-only** Chrome extension for capturing local businesses and corporate profile links into FlowChat CRM.

It does **not** use paid enrichment APIs, keyword banks, or brand presets.

## What it scrapes

| Source | How |
|--------|-----|
| Google Maps | Open results list → **Scan current page** |
| Google Places / Search | Places tab or local pack → **Scan** |
| Business website | Open site → **Capture** (emails, phones, social links) |
| LinkedIn | Company or person page → **Capture** |
| Facebook, Instagram, TikTok, YouTube, X/Twitter, Threads | Open profile → **Capture** |

Website / Maps deep-scrape still harvests contact details and social URLs from the page DOM. That is scraping, not third-party enrichment.

## Install from FlowChat

1. In FlowChat go to **Settings → LeadSnapper**.
2. Download **leadsnapper-chrome.zip**.
3. Unzip the archive to a folder.
4. Chrome → `chrome://extensions` → enable **Developer mode**.
5. **Load unpacked** → select the unzipped folder (must contain `manifest.json`).
6. Pin LeadSnapper and open the side panel from the toolbar icon.

## Daily workflow

1. Open Google Maps or Search for the city / category you care about.
2. Click **Scan current page** in the Scrape tab.
3. Scroll for more results, then scan again (**Load more** / scan again merges without duplicating).
4. Optional: open a business website or LinkedIn / social profile and use **Capture**.
5. Review **Results**, save to **Saved**, then **Export** Excel or sync to FlowChat.

## Sync to FlowChat CRM

1. FlowChat → **Settings → CRM** → enable LeadSnapper sync (and create an Integrations API key if needed).
2. In the extension **Sync** tab, paste API base URL + key and enable push.
3. From Export, sync selected leads — they appear as contacts with LeadSnapper attributes.

## Tips for local vs corporate

- **Local / SMB:** Prefer Google Maps & Places cards; then Capture the website for email/phone/socials.
- **Corporate:** Capture LinkedIn company pages and the corporate website; social profiles fill presence fields.

## Privacy

Only scrape public pages you are allowed to access. Respect site terms and applicable laws (GDPR / PECR / etc.) before marketing outreach.
