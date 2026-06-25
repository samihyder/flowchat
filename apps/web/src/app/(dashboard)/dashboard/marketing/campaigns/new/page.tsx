import { redirect } from 'next/navigation';

/** Legacy broadcast create — S6M uses wizard from campaign list. */
export default function NewCampaignPage() {
  redirect('/dashboard/marketing/campaigns');
}
