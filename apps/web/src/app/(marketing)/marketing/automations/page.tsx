'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api, type EmailAutomation } from '@/lib/api';
import { MarketingIcon } from '@/components/marketing/ui/marketing-icon';
import { MarketingPageHeader } from '@/components/marketing/ui/marketing-page-header';
import { MarketingListFooter } from '@/components/marketing/ui/marketing-list-footer';
import { marketingRoutes } from '@/lib/marketing/routes';

export default function AutomationsPage() {
  const { token, accountId } = useAuthStore();
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !accountId) return;
    api.marketing.automations
      .list(accountId, token)
      .then((r) => setAutomations(r.automations))
      .finally(() => setLoading(false));
  }, [token, accountId]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MarketingPageHeader
        title="Automations"
        action={
          <Link
            href={marketingRoutes.automationNew as Route}
            className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <MarketingIcon name="add" className="text-[20px]" />
            New automation
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-container-max-list mx-auto w-full">
        <header className="mb-8">
          <h2 className="text-headline-lg text-on-surface mb-2">Automated email sequences</h2>
          <p className="text-on-surface-variant max-w-2xl text-sm">
            Enroll contacts once — each automation sends its scheduled sequence on its own from
            here on. Enroll more contacts anytime from Contacts, or right from an automation's
            detail page.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-gray-400">Loading automations…</p>
        ) : automations.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <MarketingIcon name="bolt" className="text-4xl text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-1">No automations yet</p>
            <p className="text-sm text-gray-400 mb-4 max-w-sm">
              Build a scheduled email sequence once, enroll contacts, and it runs itself.
            </p>
            <Link
              href={marketingRoutes.automationNew as Route}
              className="marketing-btn-primary px-4 py-2 rounded-lg font-semibold text-sm"
            >
              Create your first automation
            </Link>
          </div>
        ) : (
          <div className="marketing-bento-grid">
            {automations.map((a, i) => (
              <Link
                key={a.id}
                href={marketingRoutes.automation(a.id) as Route}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary-border transition-all duration-300 animate-marketing-stagger-in block"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary-surface text-primary flex items-center justify-center shrink-0">
                      <MarketingIcon name="bolt" className="text-[22px]" />
                    </div>
                    <h3 className="font-semibold text-on-surface truncate">{a.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      a.enabled
                        ? 'bg-status-success-bg text-status-success-text'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {a.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-b border-gray-100 my-2">
                  <div>
                    <p className="text-lg font-bold text-on-surface">{a.contactCount}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Enrolled</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-on-surface">{a.emailCount}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Emails</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-on-surface">{a.emailsSent}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Sent</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  {a.completedCount} of {a.contactCount} completed · Created{' '}
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}

            <Link
              href={marketingRoutes.automationNew as Route}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-primary-border hover:text-primary min-h-[200px] transition-colors"
            >
              <MarketingIcon name="add_circle" className="text-4xl mb-2" />
              <span className="text-sm font-semibold">New automation</span>
            </Link>
          </div>
        )}
      </div>

      <MarketingListFooter />
    </div>
  );
}
