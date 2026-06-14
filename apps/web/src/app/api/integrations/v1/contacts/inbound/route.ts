import { requireIntegrationAuth } from '@/lib/integration-auth';
import { upsertIntegrationContact } from '@/lib/contact-sync';

type InboundContact = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  type?: string;
  externalId?: string | null;
  customAttributes?: Record<string, unknown>;
};

/**
 * Inbound webhook for external CRMs (Zapier, Make, HubSpot flows).
 * Accepts a single contact or batch: { contact } or { contacts: [] }
 */
export async function POST(req: Request) {
  const gate = await requireIntegrationAuth(req, 'contacts:write');
  if (!gate.ok) return gate.response;

  const body = (await req.json()) as { contact?: InboundContact; contacts?: InboundContact[] };
  const items = body.contacts ?? (body.contact ? [body.contact] : []);

  if (items.length === 0) {
    return Response.json({ error: 'Provide contact or contacts array' }, { status: 400 });
  }
  if (items.length > 500) {
    return Response.json({ error: 'Max 500 contacts per request' }, { status: 400 });
  }

  const { auth, sql } = gate;
  const results: { externalId: string | null; id: string; created: boolean; error?: string }[] = [];

  for (const item of items) {
    const name = item.name?.trim();
    if (!name) {
      results.push({
        externalId: item.externalId ?? null,
        id: '',
        created: false,
        error: 'name is required',
      });
      continue;
    }
    try {
      const { contact, created } = await upsertIntegrationContact(sql, auth.accountId, {
        name,
        email: item.email,
        phone: item.phone,
        type: item.type,
        externalId: item.externalId,
        customAttributes: item.customAttributes,
      });
      results.push({ externalId: contact.externalId, id: contact.id, created });
    } catch {
      results.push({
        externalId: item.externalId ?? null,
        id: '',
        created: false,
        error: 'failed to sync',
      });
    }
  }

  const created = results.filter((r) => r.created).length;
  const updated = results.filter((r) => !r.created && !r.error).length;
  const failed = results.filter((r) => r.error).length;

  return Response.json({ created, updated, failed, results });
}
