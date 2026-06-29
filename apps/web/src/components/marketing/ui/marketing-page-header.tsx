import type { ReactNode } from 'react';

type MarketingPageHeaderProps = {
  title: string;
  search?: ReactNode;
  action?: ReactNode;
};

export function MarketingPageHeader({ title, search, action }: MarketingPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <h2 className="text-headline-md text-on-surface truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {search}
        {action}
      </div>
    </header>
  );
}
