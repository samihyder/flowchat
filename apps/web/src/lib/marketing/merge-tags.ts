export type MergeContact = {
  name: string;
  email: string | null;
  phone?: string | null;
  type?: string;
  customAttributes?: Record<string, unknown>;
};

export function applyMergeTags(
  template: string,
  contact: MergeContact,
  extras?: Record<string, string>
): string {
  const firstName = contact.name.trim().split(/\s+/)[0] ?? contact.name;
  const tags: Record<string, string> = {
    first_name: firstName,
    name: contact.name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    type: contact.type ?? '',
    ...extras,
  };

  for (const [key, value] of Object.entries(contact.customAttributes ?? {})) {
    tags[key] = value == null ? '' : String(value);
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => tags[key] ?? '');
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Merge tags available in composer chip rail (S6M-15). */
export const MERGE_TAG_CHIPS = [
  { tag: '{{first_name}}', label: 'First name', sample: 'Alex' },
  { tag: '{{last_name}}', label: 'Last name', sample: 'Rivera' },
  { tag: '{{email}}', label: 'Email', sample: 'alex@example.com' },
  { tag: '{{phone}}', label: 'Phone', sample: '+1 555 0100' },
  { tag: '{{contact_message}}', label: 'Contact message', sample: 'Thanks for reaching out!' },
  { tag: '{{meeting_link}}', label: 'Meeting link', sample: 'https://cal.example/meet' },
  { tag: '{{portfolio_link}}', label: 'Portfolio link', sample: 'https://example.com/work' },
  { tag: '{{agent_name}}', label: 'Agent name', sample: 'Jordan Lee' },
  { tag: '{{agent_email}}', label: 'Agent email', sample: 'jordan@company.com' },
] as const;

export const SAMPLE_MERGE_CONTEXT: Record<string, string> = Object.fromEntries(
  MERGE_TAG_CHIPS.map((c) => [c.tag.replace(/\{\{|\}\}/g, ''), c.sample])
);

export function previewWithSampleMergeTags(text: string): string {
  return applyMergeTags(text, {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '+1 555 0100',
  }, SAMPLE_MERGE_CONTEXT);
}
