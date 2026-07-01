export function MetricCard({
  label,
  value,
  hint,
  delta,
  deltaNegative,
  accent = 'primary',
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: string;
  deltaNegative?: boolean;
  accent?: 'primary' | 'accent' | 'amber' | 'rose' | 'neutral';
}) {
  const accents = {
    primary: 'text-primary-600',
    accent: 'text-accent-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    neutral: 'text-gray-900',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-[28px] font-bold leading-tight mt-0.5 ${accents[accent]}`}>{value}</p>
      {delta && (
        <p className={`text-xs mt-1 ${deltaNegative ? 'text-red-500' : 'text-green-600'}`}>{delta}</p>
      )}
      {hint && !delta && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function MetricGrid({
  children,
  className = 'grid-cols-2 lg:grid-cols-4',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`grid ${className} gap-4 mb-6`}>{children}</div>;
}
