import { MarketingShell } from '@/components/layout/marketing-shell';

export default function MarketingModuleLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
