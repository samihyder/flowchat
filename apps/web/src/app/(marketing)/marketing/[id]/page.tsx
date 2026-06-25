import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function LegacyMarketingAutomationDetailPage() {
  redirect('/marketing/campaigns' as Route);
}
