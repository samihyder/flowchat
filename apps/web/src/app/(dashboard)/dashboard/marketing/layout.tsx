import { MarketingNav } from '@/components/layout/marketing-nav';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <MarketingNav />
      {children}
    </div>
  );
}
