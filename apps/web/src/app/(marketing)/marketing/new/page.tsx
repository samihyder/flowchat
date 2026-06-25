import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function LegacyMarketingAutomationPage() {
  redirect('/marketing/campaigns' as Route);
}
