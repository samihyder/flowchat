import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

/** S6M-35: workflows UI retired — send users to Campaigns. */
export default function DashboardMarketingWorkflowsRedirect() {
  redirect(marketingRoutes.campaigns as Route);
}
