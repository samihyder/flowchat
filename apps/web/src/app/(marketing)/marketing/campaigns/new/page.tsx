import type { Route } from 'next';
import { redirect } from 'next/navigation';

/** Legacy broadcast create — S6M uses wizard from campaign list. */
export default function NewCampaignPage() {
  redirect('/marketing/campaigns' as Route);
}
