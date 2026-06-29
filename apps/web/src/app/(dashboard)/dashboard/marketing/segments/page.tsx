import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

export default function DashboardMarketingSegmentsRedirect() {
  redirect(marketingRoutes.segments as Route);
}
