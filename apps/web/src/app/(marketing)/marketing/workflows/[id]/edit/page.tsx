import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

export default function WorkflowEditPage() {
  redirect(marketingRoutes.campaigns);
}
