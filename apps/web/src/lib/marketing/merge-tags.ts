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
