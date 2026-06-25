# Stitch prompt brief — S6M UI gaps

Use these prompts in Stitch to complete the marketing module design system.  
**Match existing screens** in this folder (`marketing_campaigns_list`, `campaign_wizard_review_launch`, etc.) for layout, sidebar, and tokens.

## Global design constraints (prepend to every prompt)

```
Product: FlowChat (not SalesHub). B2B email marketing inside a CRM dashboard.

Design system — use exactly:
- primary #4648d4, primary-hover #4F46E5, primary-surface #EEF2FF, primary-border #C7D2FE
- background/surface #f9f9ff, on-surface #121c2a, on-surface-variant #464554
- secondary (teal accent) #006b5f
- Fonts: Inter (UI), JetBrains Mono (IDs, merge tags, timestamps)
- Material Symbols Outlined icons
- Left sidebar 256px: Marketing → Campaigns (active), Templates
- Status badges: draft gray, scheduled blue, running green pulse, paused amber, cancelled red
- Cards: white bg, border gray-200, rounded-xl, shadow-sm
- Desktop-first 1440px; include responsive notes where noted
```

---

## Prompt 1 — Agent Step 4 (non-admin RBAC)

**Story:** S6M-32 · **File name:** `campaign_wizard_review_launch_agent`

```
Design FlowChat Campaign Wizard Step 4: Review & Launch — AGENT (non-admin) view.

Same shell as campaign_wizard_review_launch: 4-step wizard (Recipients ✓, Sequence ✓, Sender ✓, Review active), left sidebar, sticky footer.

CRITICAL RBAC difference from admin version:
- Info banner at top of review content (blue #EFF6FF, 4px left border #3B82F6, text #1E40AF):
  "An administrator must launch this campaign. You can save the draft and send a test email."
- Launch Campaign button is COMPLETELY HIDDEN in footer (not disabled — absent)
- Footer shows only: Back | Save as Draft
- Test send card remains: email input + Send test + green success "Last test sent at 11:24 AM"

Content sections (read-only for agent):
A) Pre-flight checklist table (2 columns: Check | Status) — read-only:
   - Email provider connected ✓
   - Domain verified ✓
   - Cron worker healthy ✓
   - Test email sent ✓
   - Merge tags valid ✓
   - Recipients selected (248) ✓
B) Sequence summary — 3 email cards with subject + send datetime
C) Sender block — from name, from email, reply-to, signature preview
D) Recipient preview table — paginated 5 rows, link "Edit recipients"

Logged-in user chip in sidebar: "Jamie Chen · Sales Agent" (not Admin).

Do NOT show Launch Campaign anywhere. Match existing Stitch token palette.
```

---

## Prompt 2 — Bulk template apply modal

**Story:** S6M-16, R20 · **File name:** `campaign_wizard_bulk_templates_modal`

```
Design a modal overlay on Campaign Wizard Step 2 (Email sequence) for FlowChat.

Context visible behind modal (blurred): sequence timeline with 1 existing step card, "+ Add follow-up" and "Bulk add from templates" buttons on step 2 toolbar.

Modal: max-w-xl, centered, title "Add multiple emails from templates"

Contents:
1. Search input "Search templates…"
2. Scrollable checklist list (min 6 items, 3 checked):
   ☑ Welcome — Q1 outreach
   ☑ Follow-up — case study
   ☐ Re-engagement — dormant leads
   ☐ Demo reminder
   ☑ Case study — fintech
   ☐ Holiday check-in
3. Row: "Default spacing between steps:" [3] days at [09:00] (number + time inputs)
4. Row: "First step send at:" [date picker Oct 28 2024] [time 09:00]
5. Helper text: "Creates 3 new steps (dates auto-filled, editable after confirm)"
6. Footer buttons: Cancel (secondary) | Add 3 steps (primary #4648d4)

Style: white modal, rounded-xl, shadow-2xl, p-6. Checkboxes use primary when selected.
```

---

## Prompt 3 — Campaign list empty state

**Story:** S6M-2 · **File name:** `marketing_campaigns_list_empty_state`

```
Design FlowChat Marketing Campaigns list — EMPTY STATE (first-time user).

Same page chrome as marketing_campaigns_list: sidebar, header "Campaigns", primary CTA "New campaign" top-right.

Replace table with centered empty state:
- Soft gradient hero area (indigo #EEF2FF → teal #F0FDFA subtle), envelope + calendar line illustration
- Headline: "No campaigns yet"
- Subtext: "Create a multi-step email campaign, choose recipients, and launch when you're ready."
- Primary button: "Create your first campaign"
- Secondary link: "Browse templates"

Summary metric cards at top show zeros:
- Total campaigns: 0
- Active: 0
- Total recipients: 0

No table rows. Clean, professional B2B SaaS aesthetic matching existing Stitch screens.
```

---

## Prompt 4 — Campaign list row actions (Duplicate)

**Story:** S6M-5 · **File name:** `marketing_campaigns_list_row_menu`

```
Design FlowChat Marketing Campaigns list with ROW ACTION MENU open.

Show table with 4 campaigns (mixed statuses: Running, Scheduled, Draft, Paused).
On row "Q4 Outreach — Fintech" (Draft status), kebab menu (⋮) is open showing dropdown:
- View stats
- Edit draft
- Duplicate
- Pause (disabled for draft)
- Cancel campaign

Duplicate item has subtle icon (content_copy). Hover state on Duplicate row highlighted.

Optional: small toast preview at bottom-right "Campaign duplicated — opening draft…"

Match marketing_campaigns_list styling exactly. Desktop 1440px.
```

---

## Prompt 5 — Stats: Email Steps tab

**Story:** S6M-27 · **File name:** `campaign_stats_email_steps_tab`

```
Design FlowChat Campaign Stats detail — EMAIL STEPS tab active.

Same header as campaign_stats_detail: campaign name "Q4 Outreach — Fintech Enterprise", Running badge, Pause | Cancel | Export, metadata row.

Tab bar: Overview | Email Steps (active underline primary) | Recipients | Activity Log

Content — 3 vertical step cards:

Card 1 — Step 1: Initial outreach
- Subject: "Quick question about {{company}}"
- Scheduled: Oct 24 2024 09:00 · Sent window: 09:00–09:45
- Metrics row: Sent 1,240 | Delivered 1,196 | Opened 773 (62%) | Clicked 221 (18%) | Stopped 12
- Stopped breakdown chips: bounce 4 | unsub 2 | reply 5 | complaint 1
- Thin horizontal bar chart (delivered vs opened vs clicked)

Card 2 — Step 2: Follow-up (in progress for some recipients)
- Similar layout, slightly lower open rate

Card 3 — Step 3: Demo request (pending for most)
- Scheduled future date, Sent 0 for many, status "Scheduled"

Use status colors from design system. No Overview funnel on this tab.
```

---

## Prompt 6 — Stats: Recipients tab + expand row

**Story:** S6M-28, S6M-43 · **File name:** `campaign_stats_recipients_tab`

```
Design FlowChat Campaign Stats — RECIPIENTS tab with one EXPANDED row.

Header/tabs same as campaign_stats_detail. Recipients tab active.

Filter chips row: All (active) | Opened | Not opened | Clicked | Stopped | Failed
Stopped filter shows sub-options when hovered: bounce | unsubscribe | reply | complaint

Table columns: Contact | Email | Current step | Last status | Stopped reason | Last event | (chevron)

Row 1 — Jane Doe — COLLAPSED
Row 2 — Robert King — EXPANDED (chevron rotated 90°)
  Nested timeline below row (left border 2px #E5E7EB, dots colored by status):
  • Step 1 Initial — Sent Oct 24 09:02 · Delivered · Opened Oct 24 10:15
  • Step 2 Follow-up — Stopped (reply) Oct 25 14:00 — badge purple #A855F7
  • Step 3 Demo — Skipped (gray muted #9CA3AF)
Row 3 — Lisa Miller — collapsed, status Opened

Show stopped_reason badge on Robert: "Stopped — reply"

Pagination: Showing 1–25 of 1,240 · Export CSV link top-right of table.
```

---

## Prompt 7 — Stats: Activity Log tab

**Story:** S6M-26, S6M-42 · **File name:** `campaign_stats_activity_log_tab`

```
Design FlowChat Campaign Stats — ACTIVITY LOG tab.

Tabs: Overview | Email Steps | Recipients | Activity Log (active)

Chronological event feed (newest first), monospace timestamps JetBrains Mono text-xs:

[Oct 25 14:00:12] RECIPIENT_STOP  robert.k@fintech.io — stopped_reason: reply (step 2 skipped)
[Oct 25 09:00:01] STEP_SENT       step 2 — 1,180 queued
[Oct 24 22:15:44] WEBHOOK         jane@acmecorp.com — opened step 1
[Oct 24 09:45:33] SOFT_BOUNCE     lisa@futurestack.com — retry scheduled
[Oct 24 09:02:18] STEP_SENT       step 1 — 1,240 sent
[Oct 24 09:00:00] CAMPAIGN_LAUNCH launched by Alex Sterling
[Oct 24 08:58:12] PREFLIGHT_PASS  all checks passed

Each line: timestamp | event type badge (small colored pill) | description
Event types: CAMPAIGN_LAUNCH (blue), STEP_SENT (green), WEBHOOK (gray), RECIPIENT_STOP (purple/red), SOFT_BOUNCE (amber), SKIPPED (gray), PREFLIGHT_PASS (green), COMPLAINT (red)

Admin-only subtle label top: "For debugging — sanitized errors only"
Optional filter: All events | Sends | Stops | Webhooks
```

---

## Prompt 8 — Stats Overview stop metrics block

**Story:** S6M-26, S6M-44 · **File name:** `campaign_stats_overview_stop_metrics`

```
Update FlowChat Campaign Stats OVERVIEW tab to include STOP METRICS section (or design standalone Overview variant).

Below existing funnel (Enrolled → Sent → Delivered → Opened → Clicked), add row of 4 metric cards:

| Bounced | Unsubscribed | Replied (stopped) | Complained |
|    18   |      6       |        42         |     3      |

Cards use: bounced amber #D97706, unsub gray #6B7280, replied purple #A855F7, complained red #DC2626

Below cards: rates line "Open 62.4% · Click 17.9% · Bounce 1.5%"

When campaign running, show live progress bar:
"Processing step 2 of 3 — 45/120 recipients" with indigo progress fill.

Keep existing metric cards and funnel from campaign_stats_detail. This prompt adds the missing stop-metrics block only.
```

---

## Prompt 9 — Step 4 pre-flight panel (admin, spec-aligned)

**Story:** S6M-24 · **File name:** `campaign_wizard_review_launch_preflight`

```
Design FlowChat Campaign Wizard Step 4 — admin view with PROMINENT PRE-FLIGHT PANEL.

Replace decorative "Est. ROI" banner with spec-aligned pre-flight table:

Section title: "Pre-flight checks"
2-column table, each row: check name | status icon
- Email provider (Resend connected) — green ✓
- Sending domain verified — green ✓
- Cron / worker (last success 2 min ago) — green ✓
- Inbound webhooks configured — green ✓
- Test email sent (to alex@company.com, Oct 24 11:24) — green ✓
- Merge tags validated — green ✓
- Recipients (248 selected, 3 suppressed warnings) — amber ⚠ with link

Failed row example (show one row in fail state for reference):
- Domain verified — red ✗ "Verify domain in Connected services →"

Footer: Back | Save draft | Launch Campaign (primary, admin only)
Test send card in right column unchanged.

Match campaign_wizard_review_launch layout; pre-flight is primary focus before launch.
```

---

## Prompt 10 — Sequence validation errors

**Story:** S6M-18 · **File name:** `campaign_wizard_sequence_validation_errors`

```
Design FlowChat Campaign Wizard Step 2 — VALIDATION ERROR state.

Sequence timeline with 3 step cards. User clicked Next with errors:

Top error banner (red #FEF2F2, left border #EF4444):
"Fix 3 issues before continuing"

Step 1 card — red border, inline errors:
- "Send date must be in the future"
Step 2 card — red border:
- "Send time must be after Step 1 (Oct 25 09:00)"
Step 3 card — amber border:
- "Subject is required"

Sticky footer Next button disabled (opacity 50%). Back enabled.

Show "+ Add follow-up" and "Bulk add from templates" toolbar. Match campaign_wizard_sequence styling.
```

---

## Prompt 11 — Merge validation error (missing first_name)

**Story:** S6M-41 · **File name:** `campaign_wizard_sequence_merge_validation`

```
Design FlowChat Campaign Wizard Step 2 — MERGE TAG VALIDATION error.

Error banner at top (red):
"Each email body must include {{first_name}} for personalization"

Step 2 card highlighted red border, body preview shows "Hi there," without merge tag.
Inline hint on step 2: "Add {{first_name}} in the editor"

Step 1 and 3 cards normal (green check subtle).

Button on step 2: "Open full-screen editor" (primary outline)

Reference merge chips: first_name, last_name, contact_message in design system chip style (primary-surface, mono font).
```

---

## Prompt 12 — Test send invalidated state

**Story:** S6M-23 · **File name:** `campaign_wizard_review_launch_test_invalid`

```
Design FlowChat Campaign Wizard Step 4 — TEST SEND INVALIDATED state.

Pre-flight table shows:
- Test email sent — red ✗ "Content changed since last test — send a new test"

Test send card:
- Amber warning: "Sequence or sender changed after your last test at 11:24 AM"
- Email input + Send test button (enabled)
- Launch Campaign button DISABLED with tooltip "Send a test email first"

Admin user. Match review launch layout. Launch greyed until test_valid restored.
```

---

## Suggested generation order

1. Agent Step 4 (RBAC — blocks wrong implementation)
2. Bulk templates modal
3. Stats tabs (Email steps → Recipients → Activity log)
4. Overview stop metrics
5. Empty state + row menu
6. Validation / error states
7. Pre-flight + test invalid

## After Stitch export

- Rename product strings SalesHub → FlowChat in HTML titles
- Place new folders alongside existing `code.html` screens
- Cross-check against `docs/marketing-module-screens.md` §4.3.2, §4.5C, §4.6
