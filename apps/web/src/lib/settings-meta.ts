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
  '/settings/crm': {
    title: 'CRM settings',
    description: 'Custom contact attributes and import governance',
  },
  '/settings/email-marketing': {
    title: 'Email marketing',
    description: 'Subscription defaults, sender identity, and compliance',
  },
};
