/** S6M — Marketing Campaign Module redesign (planned). Imported by update-flowchat-user-stories.mjs */

const S6M_META = {
  Sprint: 'S6M',
  'Sprint Name': 'Marketing Campaign Redesign',
  'Sprint Dates': 'Planned 2026-Q3',
  Status: 'Planned',
};

export const S6M_STORIES = [
  {
    ...S6M_META,
    'Story ID': 'S6M-1',
    'Epic / Theme': 'Campaign lifecycle',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to create a marketing campaign draft that receives a campaign ID immediately, so that I can save progress and return later.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Wizard step 0 saves draft via POST /marketing/campaigns\n• Response includes campaign id displayed in UI\n• Draft persists name, owner, created_at\n• Deep link /marketing/campaigns/:id/edit?step=N resumes wizard',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-2',
    'Epic / Theme': 'Campaign lifecycle',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a campaigns list with status filters, so that I can find drafts, running, and completed outreach.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Marketing home lists campaigns with status badges: draft, scheduled, running, paused, completed, cancelled\n• Filter by status and search by name\n• Shows recipient count and next scheduled send',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-3',
    'Epic / Theme': 'Campaign lifecycle',
    Role: 'Admin',
    'User Story':
      'As an Admin, I want to launch a campaign after review, so that scheduled emails begin processing in the background.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Only administrator role can launch\n• Launch validates pre-flight checks (provider, test send, recipients)\n• Status moves draft → scheduled/running\n• Background job enqueues step 1 per recipient\n• Audit: launched_by user id + launched_at timestamp stored on campaign; shown on stats header',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-4',
    'Epic / Theme': 'Campaign lifecycle',
    Role: 'Admin',
    'User Story':
      'As an Admin, I want to pause or cancel a running campaign, so that no further steps send until I decide.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Pause stops new sends; in-flight batch completes\n• Cancel marks campaign cancelled; pending recipient steps skipped\n• Confirmation modals show recipient impact summary (§4.10 marketing-module-screens.md)\n• Activity log records pause/cancel events',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-5',
    'Epic / Theme': 'Campaign lifecycle',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to duplicate a completed campaign as a new draft, so that I can repeat outreach with a new schedule.',
    'Story Points': 3,
    Priority: 'Should',
    'Acceptance Criteria':
      '• Duplicate copies steps and templates (snapshot) not live template links\n• Recipients not copied; test-send and launch audit reset\n• New campaign id assigned; redirect to edit step 2 to reschedule (§4.11 marketing-module-screens.md)',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-6',
    'Epic / Theme': 'Recipients',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to select multiple email recipients in the campaign wizard, so that only chosen contacts receive the sequence.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Step 1: search CRM contacts with email\n• Multi-select with select-all on page\n• At least one recipient required to proceed\n• Selected count shown on review step',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-7',
    'Epic / Theme': 'Recipients',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to load recipients from a static segment, so that I can reuse a campaign list without auto-emailing new CRM contacts.',
    'Story Points': 3,
    Priority: 'Should',
    'Acceptance Criteria':
      '• Optional “Import from segment” on step 1\n• Merges segment members into selection; user can deselect individuals\n• Dynamic segments show preview count before import',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-8',
    'Epic / Theme': 'Recipients',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want warnings for suppressed or invalid recipients, so that I do not accidentally include bounced or unsubscribed contacts.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Suppressed/unsubscribed/bounced contacts flagged in picker\n• Launch blocks sends to suppressed addresses\n• Summary shows excluded count with reasons',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-9',
    'Epic / Theme': 'CRM isolation',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want no marketing email triggered on contact create/import/chat, so that outreach only starts from the Marketing module.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Remove triggerMarketingWorkflows on contact_created from: manual CRUD, CSV import, LeadSnapper/integration upsert, widget session create\n• Remove conversation_resolved and label_added auto-enroll from marketing\n• Legacy workflow UI hidden or admin-only deprecated\n• CRM contacts unaffected when added via any medium; double opt-in transactional mail is not a marketing campaign',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-10',
    'Epic / Theme': 'Recipients',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a review step showing all recipients before launch, so that I can confirm the audience.',
    'Story Points': 2,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Step 4 lists recipient names and emails (paginated)\n• Shows subscribed-only confirmation\n• Edit recipients link returns to step 1',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-11',
    'Epic / Theme': 'Templates',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a template library independent of campaigns, so that I can build reusable email content ahead of time.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Marketing → Templates: list, create, edit, archive, duplicate\n• Templates have name, subject, html_body, plain text fallback auto-generated from HTML on save (editable)\n• No campaign required to save a template',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-12',
    'Epic / Theme': 'Templates',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a full-screen enterprise email composer, so that I can write professional HTML emails with focus.',
    'Story Points': 8,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Composer opens full viewport overlay from wizard or template library\n• Rich text: headings, bold, links, lists, undo\n• Subject line field above body\n• Mobile-safe preview toggle\n• Escape/minimize returns to wizard without losing draft',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-13',
    'Epic / Theme': 'Templates',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a checkbox to save an email as a template during the campaign wizard, so that I can reuse content on future campaigns.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Per sequence step: “Save as template” with name field\n• On launch, creates template if checked\n• Template library shows source campaign metadata optional',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-14',
    'Epic / Theme': 'Templates',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want campaign email content snapshotted at launch, so that later template edits do not change in-flight campaigns.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• campaign_steps store subject/html snapshot per step\n• Editing library template does not alter running campaign\n• Duplicate campaign copies snapshots',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-15',
    'Epic / Theme': 'Templates',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want merge tag chips in the composer, so that I can insert personalization tokens without typing syntax.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Chips: first_name, last_name, email, phone, contact_message, meeting_link, portfolio_link, agent_name, agent_email\n• Insert at cursor in subject or body\n• Preview mode renders sample contact',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-16',
    'Epic / Theme': 'Email sequence',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to add multiple follow-up emails in one campaign, so that I can run dated sequences.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Step 2: add/remove email rows (min 1)\n• Each row: pick one template or write from scratch\n• Optional bulk apply: select multiple templates at once → creates one step per template with default schedule spacing\n• Sequence order preserved as step_order',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-17',
    'Epic / Theme': 'Email sequence',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to set an explicit date and time for each email, so that scheduling is fully under my control.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Date+time picker per step; no system timezone preference for scheduling UI\n• Display shows agent-selected datetime as stored (UTC backend)\n• Timeline preview visualizes all steps',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-18',
    'Epic / Theme': 'Email sequence',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want validation that each follow-up is scheduled after the previous email, so that the sequence order is logical.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Step N send_at > step N-1 send_at\n• All send_at must be in the future at launch\n• Clear inline error on violation',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-19',
    'Epic / Theme': 'Email sequence',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want to pick a contact message for the contact_message merge field, so that emails reference a specific note or chat message.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Per step with {{contact_message}}: agent selects source mode (industry-standard per-recipient resolution):\n  – latest_note: most recent CRM note for each recipient\n  – latest_inbound_chat: most recent visitor message in any linked conversation\n  – latest_note_or_chat: inbound chat if any, else latest note, else omit token\n• Wizard preview uses sample contact (first selected recipient or explicit sample picker); send-time resolution is per recipient\n• merge_config stored on campaign_step; empty resolution omits token (no literal placeholder)\n• Source mode required before launch when token present',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-20',
    'Epic / Theme': 'Email sequence',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want file attachments disabled in marketing emails, so that campaigns stay lightweight and compliant.',
    'Story Points': 2,
    Priority: 'Must',
    'Acceptance Criteria':
      '• No attachment UI in composer\n• API rejects attachment payloads on campaign send\n• QA checklist includes negative test',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-21',
    'Epic / Theme': 'Signature & compliance',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a proper signature block after my name in the footer, so that emails look professional.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Step 3: signature rich editor or workspace default\n• Rendered after body: agent name → signature HTML\n• Validation: signature or workspace default required',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-22',
    'Epic / Theme': 'Signature & compliance',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want meeting and portfolio links in the footer, so that recipients can book or view our work.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• meeting_link and portfolio_link merge tags from workspace settings; overridable per campaign\n• Appended in footer block after signature\n• Preview shows resolved URLs',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-23',
    'Epic / Theme': 'Signature & compliance',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I must send a test email before an admin launches the campaign, so that content and deliverability are verified.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Launch button disabled until a test send succeeded for this campaign draft (persists across sessions until content/sender changes invalidate)\n• Agent or admin can trigger test; uses step 1 content with logged-in user as merge sample\n• Test send logged on campaign: test_sent_at, test_sent_by, test_sent_to; invalidates if step 1 subject/body or sender changes',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-24',
    'Epic / Theme': 'Infrastructure',
    Role: 'Admin',
    'User Story':
      'As an Admin, I want a pre-flight panel showing email provider and cron health, so that I know the system can send before launch.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Checks: connected Resend/SendGrid/Mailgun or platform key; domain verified; last cron success < 2 min\n• Failures show actionable messages\n• Shown on review step and Settings → Email marketing',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-25',
    'Epic / Theme': 'Signature & compliance',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want unsubscribe and physical address footer on every marketing email, so that we stay compliant.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• System appends List-Unsubscribe header and footer link\n• Physical address from workspace settings\n• Cannot be removed by agent; preview shows footer',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-26',
    'Epic / Theme': 'Analytics',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a campaign overview with funnel metrics, so that I see performance at a glance.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Detail page: sent, delivered, opened, clicked, bounced, unsubscribed, complained, stopped counts\n• Aggregate open/click rates\n• Live progress during running state\n• Activity log tab: chronological send attempts, webhook events, skips, sanitized errors (admin-readable)',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-27',
    'Epic / Theme': 'Analytics',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want per-email-step statistics, so that I know which follow-up performs best.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Tab or section per step: subject, scheduled time, sent count, open %, click %\n• Stopped-by-bounce/reply/unsub/complaint counts per step',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-28',
    'Epic / Theme': 'Analytics',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a recipient table with filters, so that I can see who opened, clicked, or stopped.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Columns: contact, email, per-step status, stopped_reason, last event time\n• Filters: opened, not_opened, clicked, bounced, stopped_bounce, stopped_unsubscribe, stopped_reply, stopped_complaint (map from campaign_recipient.stopped_reason per §1.2 in marketing-module-screens.md)\n• Link to contact profile',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-29',
    'Epic / Theme': 'Analytics',
    Role: 'Admin',
    'User Story':
      'As an Admin, I want to export campaign results as CSV, so that I can report offline.',
    'Story Points': 3,
    Priority: 'Should',
    'Acceptance Criteria':
      '• Export recipient × step × status × timestamps\n• Includes stopped_reason column\n• Download from campaign detail',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-30',
    'Epic / Theme': 'Analytics',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want campaign emails on the contact profile timeline, so that CRM and marketing stay connected.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Contact profile shows campaign name, step, sent/opened/clicked/stopped events\n• Consistent with campaign detail recipient row',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-31',
    'Epic / Theme': 'Infrastructure',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want try/catch and safe error messages across the marketing module, so that failures never expose raw provider responses.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• MarketingError codes mapped to UI strings per §3.1 marketing-module-screens.md\n• API returns { error, code }; no stack traces to client\n• Failed sends retried with cap; logged server-side',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-32',
    'Epic / Theme': 'Infrastructure',
    Role: 'Admin',
    'User Story':
      'As an Admin, I want only administrators to launch campaigns, so that outbound email is controlled.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Agents can build drafts; launch requires administrator role\n• API enforces RBAC on launch/pause/cancel\n• Agents on step 4 see info banner: “An administrator must launch this campaign” + Launch button hidden; test send and Save draft remain available',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-33',
    'Epic / Theme': 'Infrastructure',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want the cron/worker to process campaign steps by scheduled time, so that follow-ups send reliably in the background.',
    'Story Points': 8,
    Priority: 'Must',
    'Acceptance Criteria':
      '• job-runner processes campaign_recipient_steps where send_at <= now\n• Idempotent: same step+recipient never double-sent\n• Primary: Railway worker polls GET /api/cron/marketing every ~60s\n• Backup: Vercel Cron hits same endpoint every 5 min when WORKER unavailable (env + runbook documented)\n• Health panel shows last successful cron timestamp',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-34',
    'Epic / Theme': 'Infrastructure',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want delivery webhooks from Resend/SendGrid/Mailgun to update stats, so that opens and bounces reflect within minutes.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Per-credential webhook URLs ingest delivered, opened, clicked, bounced, complained\n• Updates campaign_recipient_step status and contact_email_events\n• Webhook signature verified',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-35',
    'Epic / Theme': 'CRM isolation',
    Role: 'Admin',
    'User Story':
      'As an Admin, I want legacy CRM-triggered workflows removed from Marketing navigation, so that agents only use the campaign wizard.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Nav: Campaigns, Templates only (segments optional sub-link)\n• /marketing/workflows and old automations redirect or 410\n• Docs updated',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-36',
    'Epic / Theme': 'Stop rules',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want hard bounces to stop all remaining follow-ups for that recipient in the campaign, so that we do not mail invalid addresses.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Hard/permanent bounce (provider permanent flag or second soft within 72h): campaign_recipient.stopped_reason=bounce; pending steps set status=stopped_bounce\n• Soft bounce: retry once after 4h; second failure treated as hard bounce\n• Global suppress on hard bounce (contact email status)\n• Other recipients continue\n• Stats aggregate stopped_bounce count',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-37',
    'Epic / Theme': 'Stop rules',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want unsubscribes to stop all remaining follow-ups for that email address in the campaign, so that opt-out is honoured immediately.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Unsubscribe link suppresses globally and stops pending campaign steps for that address\n• campaign_recipient.stopped_reason=unsubscribe; pending steps status=stopped_unsubscribe\n• Launch already blocks suppressed addresses',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-38',
    'Epic / Theme': 'Stop rules',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want replies from the recipient email address to stop remaining follow-ups in that campaign, so that engaged contacts are not over-mailed.',
    'Story Points': 8,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Primary: inbound reply matched via In-Reply-To/References to outbound Message-ID (Sprint 7 email inbox)\n• Fallback until inbox live: provider reply/engagement webhook if supported by connected ESP\n• campaign_recipient.stopped_reason=reply; pending steps status=stopped_reply\n• Reply does not stop other campaigns or other recipients\n• Documented dependency: full reply-stop requires Sprint 7 inbound routing',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-39',
    'Epic / Theme': 'Campaign lifecycle',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want wizard step navigation with saved progress, so that I can complete a campaign across sessions.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Steps: Recipients → Sequence → Sender → Review\n• Back/next preserves data; autosave on step change\n• Invalid step cannot proceed; errors inline',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-40',
    'Epic / Theme': 'UX consistency',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want consistent Marketing UI connected to CRM, so that the module feels enterprise-grade.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Shared dashboard shell, typography, settings cards pattern\n• Breadcrumbs: Marketing → Campaigns → [name]\n• Contact links open CRM profile in same tab\n• QA pass on responsive breakpoints',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-41',
    'Epic / Theme': 'Email sequence',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want mandatory merge-field validation before launch, so that every email includes required personalization.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Each step body must include {{first_name}}\n• If {{contact_message}} appears in subject/body, source mode must be configured for that step (S6M-19)\n• {{phone}} and empty {{contact_message}} omitted in output when absent (no literal empty token)\n• Validation errors list all steps before launch',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-42',
    'Epic / Theme': 'Stop rules',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want the send engine to skip stopped recipients before each step, so that cancelled follow-ups never dispatch.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Before send: if campaign_recipient.stopped_reason is set, skip all pending steps (mark status=skipped, reason copied to activity log)\n• Cron idempotent check respects stopped state\n• Stats and activity log record skip reason',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-43',
    'Epic / Theme': 'Analytics',
    Role: 'Agent',
    'User Story':
      'As a Sales agent, I want a per-recipient per-email-step detail view, so that I can see exactly what happened for each follow-up.',
    'Story Points': 5,
    Priority: 'Must',
    'Acceptance Criteria':
      '• Recipient row expands or drill-down shows each step: scheduled time, sent time, delivered, opened, clicked, step status, stopped_reason (recipient-level if stopped)\n• Links to provider message id (admin)\n• Matches contact profile timeline events',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-44',
    'Epic / Theme': 'Stop rules',
    Role: 'Platform',
    'User Story':
      'As a Platform, I want spam complaints to stop remaining follow-ups and suppress the address globally, so that deliverability matches ESP industry practice.',
    'Story Points': 3,
    Priority: 'Must',
    'Acceptance Criteria':
      '• On complained webhook: global suppress + campaign_recipient.stopped_reason=complaint\n• Pending steps status=stopped_complaint for that campaign only (same as hard bounce)\n• Admin alert or activity log entry for complaint events\n• Stats aggregate stopped_complaint count',
  },
  {
    ...S6M_META,
    'Story ID': 'S6M-45',
    Status: 'Completed',
    'Epic / Theme': 'Visual design',
    Role: 'Admin',
    'User Story':
      'As a Admin, I want the marketing module wireframes and the live app to match the cosmetic polish of the Stitch design-system benchmark (stitch_flow_marketing_module_design_system/), so that the campaigns experience feels as smooth as a shipped SaaS product without losing the wireframes’ functional depth.',
    'Story Points': 5,
    Priority: 'Should',
    'Acceptance Criteria':
      '• Benchmarked stitch_flow_marketing_module_design_system/ against userstory-wireframes/24–28; kept the wireframes as the structural/functional source of truth (real app already matches their nav, badges, data density) and ported only cosmetic wins, since Stitch’s own screens were internally inconsistent (mismatched top bars, wizard-footer chrome leaking onto non-wizard pages, SalesHub vs FlowChat branding)\n• 26-marketing-campaigns.html, 24/25/27/28: removed the redundant slim-topbar-title + large-H1 duplicate header\n• 26-marketing-campaigns.html: fixed KPI strip using undefined stat-card/stat-value/stat-label classes (rendered unstyled) — corrected to the file’s real metric-card/metric-value/metric-label classes\n• 26-marketing-campaigns.html: added a Stitch-style illustrated empty state (layered card icon, gradient panel, dual CTA) behind a With-campaigns/Empty-state demo toggle\n• 27-marketing-campaign-analytics.html: redesigned the delivery funnel as tapering, indented, thick-pill bars with bold values (Stitch-style), while keeping the wireframe’s superior data density (opens-over-time chart, link-click table, per-recipient drill-down) that Stitch’s version lacks; split out Unsubscribed/Bounced/Marked-as-spam as de-emphasized exception metrics rather than funnel stages\n• Same empty-state and funnel-bar treatment ported into the live app (apps/web marketing campaigns list + campaign detail)',
  },
];
