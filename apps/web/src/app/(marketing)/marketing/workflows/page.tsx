import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

/** S6M-35: CRM-triggered workflows UI retired — campaign-only outreach. */
export default function WorkflowsPage() {
  redirect(marketingRoutes.campaigns);
}
