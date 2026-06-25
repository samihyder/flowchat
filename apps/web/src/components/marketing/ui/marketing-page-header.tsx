import type { ReactNode } from 'react';

type MarketingPageHeaderProps = {
  title: string;
  search?: ReactNode;
  action?: ReactNode;
};

export function MarketingPageHeader({ title, search, action }: MarketingPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-mkt-surface/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-8 shrink-0">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {search}
        {action}
      </div>
    </header>
  );
}
