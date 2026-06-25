import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function LegacyMarketingAutomationEditPage() {
  redirect('/marketing/campaigns' as Route);
}
