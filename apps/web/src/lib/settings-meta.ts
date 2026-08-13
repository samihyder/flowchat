export type SettingsMeta = { title: string; description: string };

export const SETTINGS_META: Record<string, SettingsMeta> = {
  '/settings/account': {
    title: 'Account settings',
    description: 'Manage your workspace profile and preferences',
  },
  '/settings/security': {
    title: 'Security',
    description: 'Two-factor authentication and visitor blocking',
  },
  '/settings/agents': {
    title: 'Agents',
    description: 'Invite teammates and manage roles',
  },
  '/settings/teams': {
    title: 'Teams',
    description: 'Organize agents into routing groups',
  },
  '/settings/inboxes': {
    title: 'Inboxes',
    description: 'Web chat widgets, embed codes, and channel settings',
  },
  '/settings/labels': {
    title: 'Labels',
    description: 'Create tags to organize and filter conversations',
  },
  '/settings/canned-responses': {
    title: 'Canned responses',
    description: 'Shortcut snippets agents insert with / in the composer',
  },
  '/settings/auto-messages': {
    title: 'Auto messages',
    description: 'Welcome, offline, and proactive chat messages',
  },
  '/settings/integrations': {
    title: 'Integrations',
    description: 'Webhooks, API keys, and audit log',
  },
  '/settings/connected-services': {
    title: 'Connected services',
    description: 'Tenant-owned API keys for email marketing and AI',
  },
  '/settings/crm': {
    title: 'CRM settings',
    description: 'Custom contact attributes and import governance',
  },
  '/settings/leadsnapper': {
    title: 'LeadSnapper',
    description: 'Download the Chrome scraper and connect local / corporate leads to FlowChat',
  },
  '/settings/enrichment-flows': {
    title: 'Enrichment flows',
    description: 'Drag-and-drop contact enrichment pipelines per tenant',
  },
  '/settings/email-marketing': {
    title: 'Email marketing',
    description: 'Subscription defaults, sender identity, and compliance',
  },
  '/settings/automation-rules': {
    title: 'Automation rules',
    description: 'Trigger actions on conversation and contact events',
  },
  '/settings/macros': {
    title: 'Macros',
    description: 'One-click agent actions for common workflows',
  },
  '/settings/sla': {
    title: 'SLA policies',
    description: 'First response, next response, and resolution targets',
  },
  '/settings/roles': {
    title: 'Roles & SAML',
    description: 'Custom roles and single sign-on configuration',
  },
  '/settings/notifications': {
    title: 'Notifications',
    description: 'Visitor alert sound for the web dashboard and installed app',
  },
  '/settings/ai-assistants': {
    title: 'AI assistants',
    description: 'Copilot assistants and knowledge documents',
  },
  '/settings/help-center': {
    title: 'Help Center',
    description: 'Public portals, categories, and articles',
  },
};
