'use client';

import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';

export type MarketingHealthData = {
  providerOk: boolean;
  providerLabel: string;
  domainStatus: string;
  domainOk: boolean;
  cronOk: boolean;
  cronLastAt: string | null;
  cronLastProcessed: number;
  cronError: string | null;
  webhookUrl: string | null;
  webhookSigningConfigured?: boolean;
  fromEmail: string;
};

type Props = {
  health: MarketingHealthData | null;
  loading?: boolean;
  onProcessDue?: () => void;
  processingDue?: boolean;
  processDueMessage?: string | null;
};

export function MarketingHealthPanel({
  health,
  loading,
  onProcessDue,
  processingDue,
  processDueMessage,
}: Props) {
  if (loading || !health) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-48 mb-4" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-24 bg-gray-50 rounded-lg" />
          <div className="h-24 bg-gray-50 rounded-lg" />
        </div>
      </section>
    );
  }

  const hasProviderError = !health.providerOk;
  const hasDomainError = !health.domainOk && Boolean(health.fromEmail);
  const hasCronError = !health.cronOk;

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-3">
          <MarketingIcon name="monitor_heart" className="text-primary text-[24px]" />
          <h2 className="text-headline-sm text-on-surface">Marketing Health</h2>
        </div>
        {(hasProviderError || hasDomainError || hasCronError) && (
          <span className="bg-status-danger-bg text-status-danger-text px-3 py-1 rounded-full text-[10px] font-bold uppercase">
            Attention needed
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {hasProviderError && (
          <div className="rounded-xl border border-status-danger-text/30 bg-status-danger-bg/40 p-5 flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-status-danger-bg flex items-center justify-center shrink-0">
              <MarketingIcon name="link_off" className="text-status-danger-text text-[28px]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-status-danger-text">Email provider not connected</p>
              <p className="text-sm text-status-danger-text/90 mt-1">
                Connect Resend or another ESP in Connected services before launching campaigns.
              </p>
              <a
                href="/dashboard/settings/connected-services"
                className="inline-flex mt-3 text-sm font-bold text-primary hover:underline"
              >
                Re-verify connection →
              </a>
            </div>
          </div>
        )}

        {hasDomainError && (
          <div className="rounded-lg border border-status-danger-text/20 bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text flex items-start gap-2">
            <MarketingIcon name="error" className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Domain verification required</p>
              <p className="text-xs mt-0.5 opacity-90">
                Sending domain for {health.fromEmail} is {health.domainStatus}. Verify DNS before
                launching campaigns.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
            <p className="text-label-caps text-gray-400 uppercase text-xs mb-2">Provider</p>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${health.providerOk ? 'bg-status-success-text' : 'bg-status-danger-text'}`}
              />
              <p className="font-semibold text-on-surface">{health.providerLabel}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {health.providerOk ? 'Connected and ready' : 'Add a provider in Connected services'}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
            <p className="text-label-caps text-gray-400 uppercase text-xs mb-2">Cron scheduler</p>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${health.cronOk ? 'bg-status-success-text' : 'bg-status-paused-text'}`}
              />
              <p className="font-semibold text-on-surface">
                {health.cronOk ? 'Healthy' : 'Stale or offline'}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-data-mono">
              {health.cronLastAt
                ? `Last run ${new Date(health.cronLastAt).toLocaleString()} · ${health.cronLastProcessed} processed`
                : 'No cron runs recorded yet'}
            </p>
            {health.cronError && (
              <p className="text-xs text-status-danger-text mt-1">{health.cronError}</p>
            )}
            {onProcessDue ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-3">
                  Campaign emails only send when the scheduler runs. On preview deployments, trigger
                  it manually if sends are past their scheduled time.
                </p>
                <button
                  type="button"
                  onClick={onProcessDue}
                  disabled={processingDue}
                  className="marketing-btn-primary w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {processingDue ? 'Processing…' : 'Process due sends now'}
                </button>
                {processDueMessage ? (
                  <p
                    className={`text-xs mt-2 ${processDueMessage.startsWith('Processed') ? 'text-status-success-text' : 'text-status-danger-text'}`}
                  >
                    {processDueMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-label-caps text-gray-400 uppercase text-xs mb-2">Inbound webhook URL</p>
          {health.webhookUrl ? (
            <>
              <p className="text-xs font-data-mono text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                {health.webhookUrl}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Paste this URL in your ESP. Events are rejected unless a signing secret is configured
                {health.webhookSigningConfigured === false
                  ? ' — add the ESP signing secret under Connected Services before enabling the webhook.'
                  : ' (Svix / whsec_ for Resend).'}
              </p>
            </>
          ) : (
            <p className="text-xs text-status-danger-text bg-status-danger-surface rounded-lg px-3 py-2 border border-status-danger-border">
              No signed webhook endpoint available. Connect an email credential under Connected
              Services and add the ESP signing secret, or set RESEND_WEBHOOK_SECRET for platform
              Resend.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
