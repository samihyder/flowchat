import { requireIntegrationAuth } from '@/lib/integration-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { syncLeadSnapperLeads, type LeadSnapperInboundLead } from '@/lib/leadsnapper-sync';

/**
 * LeadSnapper → Flow CRM sync endpoint.
 * Accepts ecosystem-plan shape: { source, leads } or { leads: [] }.
 */
export async function POST(req: Request) {
  const gate = await requireIntegrationAuth(req, 'contacts:write');
  if (!gate.ok) return gate.response;

  const settings = await getAccountSettings(gate.sql, gate.auth.accountId);
  if (!settings.leadsnapperSyncEnabled) {
    return Response.json(
      {
        error:
          'LeadSnapper sync is not enabled. Enable it in FlowChat → Settings → CRM → LeadSnapper provisioning.',
      },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    source?: string;
    leads?: LeadSnapperInboundLead[];
    lead?: LeadSnapperInboundLead;
  };

  const leads = body.leads ?? (body.lead ? [body.lead] : []);
  if (leads.length === 0) {
    return Response.json({ error: 'Provide leads array' }, { status: 400 });
  }
  if (leads.length > 500) {
    return Response.json({ error: 'Max 500 leads per request' }, { status: 400 });
  }

  const result = await syncLeadSnapperLeads(gate.sql, gate.auth.accountId, leads);

  return Response.json({
    source: body.source ?? 'leadsnapper',
    ...result,
  });
}
