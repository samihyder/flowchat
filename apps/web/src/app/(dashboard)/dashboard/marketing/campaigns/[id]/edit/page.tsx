import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { marketingRoutes } from '@/lib/marketing/routes';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function DashboardMarketingCampaignEditRedirect({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { step } = await searchParams;
  const stepNum = step ? Number(step) : undefined;
  redirect(
    marketingRoutes.campaignEdit(id, Number.isFinite(stepNum) ? stepNum : undefined) as Route
  );
}
