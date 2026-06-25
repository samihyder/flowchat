import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

export default function LegacyMarketingRedirectPage() {
  redirect(marketingRoutes.campaigns as Route);
}
