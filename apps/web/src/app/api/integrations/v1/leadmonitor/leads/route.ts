import { requireIntegrationAuth } from '@/lib/integration-auth';
import { getAccountSettings } from '@/lib/account-settings-db';
import { syncLeadMonitorLeads, type LeadMonitorInboundLead } from '@/lib/leadmonitor-sync';

export async function POST(req: Request) {
  const gate = await requireIntegrationAuth(req, 'contacts:write');
  if (!gate.ok) return gate.response;

  const settings = await getAccountSettings(gate.sql, gate.auth.accountId);
  if (!settings.leadmonitorSyncEnabled) {
    return Response.json(
      {
        error:
          'LeadMonitor sync is not enabled. Enable it in FlowChat → Settings → Integrations → Ecosystem.',
      },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    source?: string;
    leads?: LeadMonitorInboundLead[];
    lead?: LeadMonitorInboundLead;
  };

  const leads = body.leads ?? (body.lead ? [body.lead] : []);
  if (leads.length === 0) {
    return Response.json({ error: 'Provide leads array' }, { status: 400 });
  }
  if (leads.length > 200) {
    return Response.json({ error: 'Max 200 leads per request' }, { status: 400 });
  }

  const result = await syncLeadMonitorLeads(gate.sql, gate.auth.accountId, leads);

  return Response.json({
    source: body.source ?? 'leadmonitor',
    ...result,
  });
}
