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
      ? 'bg-primary-surface'
      : variant === 'accent'
        ? 'border-primary-border'
        : '';

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm ${variantClass}`}>
      <p className="text-label-caps text-gray-500 uppercase">{label}</p>
      <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
      {hint ? <div className="text-xs text-gray-400 font-medium mt-2">{hint}</div> : null}
    </div>
  );
}

export function MarketingMetricGrid({ children }: { children: ReactNode }) {
  return <section className="grid grid-cols-1 md:grid-cols-4 gap-6">{children}</section>;
}
