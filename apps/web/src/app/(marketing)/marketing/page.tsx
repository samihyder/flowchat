import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function MarketingHomePage() {
  redirect('/marketing/campaigns' as Route);
}
