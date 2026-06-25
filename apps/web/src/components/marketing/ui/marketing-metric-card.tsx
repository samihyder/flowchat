import type { ReactNode } from 'react';

type MarketingMetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  variant?: 'default' | 'active' | 'accent';
};

export function MarketingMetricCard({
  label,
  value,
  hint,
  variant = 'default',
}: MarketingMetricCardProps) {
  const variantClass =
    variant === 'active'
      ? 'bg-mkt-primary-surface'
      : variant === 'accent'
        ? 'border-mkt-primary-border'
        : '';

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm ${variantClass}`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {hint ? <div className="text-xs text-gray-400 font-medium mt-2">{hint}</div> : null}
    </div>
  );
}

export function MarketingMetricGrid({ children }: { children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">{children}</section>
  );
}
