import type { ReactNode } from 'react';

type MarketingPageHeaderProps = {
  title: string;
  search?: ReactNode;
  action?: ReactNode;
};

export function MarketingPageHeader({ title, search, action }: MarketingPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-headline-md text-gray-900">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        {search}
        {action}
      </div>
    </header>
  );
}
