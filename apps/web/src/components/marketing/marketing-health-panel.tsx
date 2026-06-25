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
  webhookUrl: string;
  fromEmail: string;
};

type Props = {
  health: MarketingHealthData | null;
  loading?: boolean;
};

export function MarketingHealthPanel({ health, loading }: Props) {
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

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Marketing Health</h2>
        <MarketingIcon name="monitor_heart" className="text-primary" />
      </div>

      {!health.domainOk && health.fromEmail && (
        <div className="rounded-lg border border-status-danger-text/20 bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text flex items-start gap-2">
          <MarketingIcon name="error" className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Domain verification required</p>
            <p className="text-xs mt-0.5 opacity-90">
              Sending domain for {health.fromEmail} is {health.domainStatus}. Verify DNS before launching campaigns.
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
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <p className="text-label-caps text-gray-400 uppercase text-xs mb-2">Inbound webhook URL</p>
        <p className="text-xs font-data-mono text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          {health.webhookUrl}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Configure this URL in your ESP for delivery, bounce, and complaint events.
        </p>
      </div>
    </section>
  );
}
