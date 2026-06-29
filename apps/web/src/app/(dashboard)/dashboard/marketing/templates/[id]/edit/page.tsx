import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

type Props = { params: Promise<{ id: string }> };

export default async function DashboardMarketingTemplateEditRedirect({ params }: Props) {
  const { id } = await params;
  redirect(marketingRoutes.templateEdit(id) as Route);
}
