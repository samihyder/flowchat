import { neon } from '@/lib/neon';
import type { AppSql } from '@/lib/db-sql';
import { pollEmailInboxesStub } from '@/lib/channels/email-inbox';
import { dispatchDueChannelCampaigns } from '@/lib/campaigns/channel-campaigns';
import { checkSlaBreaches } from '@/lib/sla/policies';
import { requireCronAuth } from '@/lib/cron-auth';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const sql = neon(process.env.DATABASE_URL!) as AppSql;
  try {
    const [imapPolled, slaBreaches, campaignsDispatched] = await Promise.all([
      pollEmailInboxesStub(sql),
      checkSlaBreaches(sql),
      dispatchDueChannelCampaigns(sql),
    ]);
    return Response.json({
      ok: true,
      imapPolled,
      slaBreaches,
      campaignsDispatched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
